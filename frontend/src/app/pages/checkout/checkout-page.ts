import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';

import { CartItem, CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { UiService } from '../../core/services/ui.service';
import { StripePaymentService } from './stripe-payment.service';

type ShippingMethod = 'standard' | 'express' | 'full_truckload' | 'freight_shipping';
type PaymentMethod = 'card' | 'invoice';
type CheckoutField =
    | 'fullName'
    | 'email'
    | 'phone'
    | 'addressLine1'
    | 'city'
    | 'state'
    | 'postalCode'
    | 'shippingMethod'
    | 'paymentMethod';

@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent implements AfterViewInit {
  @ViewChild('paymentElementRef') paymentElementRef?: ElementRef<HTMLDivElement>;

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly ui = inject(UiService);
  private readonly stripePaymentService = inject(StripePaymentService);

  readonly submitted = signal(false);
  readonly orderPlaced = signal(false);
  readonly orderNumber = signal('');
  readonly placedTotal = signal(0);
  readonly submissionError = signal<string | null>(null);
  readonly placingOrder = signal(false);
  readonly needsFinalPriceConfirmation = signal(false);

  readonly shippingMethod = signal<ShippingMethod>('standard');
  readonly paymentMethod = signal<PaymentMethod>('card');

  readonly stripeReady = signal(false);
  readonly stripeLoading = signal(false);
  readonly stripeInitAttempted = signal(false);
  readonly stripeClientSecret = signal<string | null>(null);
  readonly stripeOrderId = signal<number | null>(null);
  readonly stripePaymentIntentId = signal<string | null>(null);

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;
  private paymentElementMounted = false;

  readonly isOrganizationUser = computed(() => this.auth.isOrganization());
  readonly shouldHideShippingSection = computed(
      () => this.isOrganizationUser() && this.shippingMethod() === 'full_truckload'
  );
  readonly shouldShowOrganizationShippingSelector = computed(() => this.isOrganizationUser());

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9()+\-\s]{7,20}$/)]],
    company: [''],
    addressLine1: ['', [Validators.required]],
    addressLine2: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    postalCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9 -]{4,12}$/)]],
    notes: [''],
    shippingMethod: ['standard' as ShippingMethod, [Validators.required]],
    paymentMethod: ['card' as PaymentMethod, [Validators.required]],
  });

  readonly hasItems = computed(() => this.cart.items().length > 0);
  readonly taxRate = 0.08;

  readonly shippingFee = computed(() => {
    if (!this.hasItems()) return 0;

    if (this.isOrganizationUser()) {
      if (this.shippingMethod() === 'full_truckload') return 0;
      if (this.shippingMethod() === 'freight_shipping') {
        return this.cart.subtotal() >= 150 ? 0 : 8.5;
      }
    }

    if (this.shippingMethod() === 'express') return 18;
    return this.cart.subtotal() >= 150 ? 0 : 8.5;
  });

  readonly taxAmount = computed(() => this.cart.subtotal() * this.taxRate);
  readonly orderTotal = computed(() => this.cart.subtotal() + this.shippingFee() + this.taxAmount());

  constructor() {
    if (this.auth.isOrganization()) {
      this.form.controls.shippingMethod.setValue('freight_shipping', { emitEvent: false });
      this.shippingMethod.set('freight_shipping');
    }

    this.form.controls.shippingMethod.valueChanges
        .pipe(startWith(this.form.controls.shippingMethod.value), takeUntilDestroyed())
        .subscribe((value) => {
          const method: ShippingMethod =
              value === 'express'
                  ? 'express'
                  : value === 'full_truckload'
                      ? 'full_truckload'
                      : value === 'freight_shipping'
                          ? 'freight_shipping'
                          : 'standard';

          this.shippingMethod.set(method);
          this.syncShippingValidators();
        });

    this.form.controls.paymentMethod.valueChanges
        .pipe(startWith(this.form.controls.paymentMethod.value), takeUntilDestroyed())
        .subscribe((value) => {
          const method: PaymentMethod = value === 'invoice' ? 'invoice' : 'card';
          const previous = this.paymentMethod();

          this.paymentMethod.set(method);

          if (method === 'invoice') {
            this.destroyStripeElement();
          } else if (previous !== 'card') {
            queueMicrotask(() => {
              void this.prepareStripeIfNeeded(true);
            });
          }
        });

    this.syncShippingValidators();
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.paymentMethod() === 'card') {
      queueMicrotask(() => {
        void this.prepareStripeIfNeeded();
      });
    }
  }

  showError(field: CheckoutField): boolean {
    const control = this.form.controls[field];
    return (this.submitted() || control.touched) && control.invalid;
  }

  lineTotal(item: CartItem): number {
    return item.lineTotal;
  }

  private buildCheckoutPayload(paymentMethodOverride?: PaymentMethod) {
    return {
      cartId: this.cart.cartId(),
      fullName: this.form.getRawValue().fullName,
      email: this.auth.userEmail() || this.form.getRawValue().email,
      phone: this.form.getRawValue().phone,
      company: this.form.getRawValue().company,
      addressLine1: this.form.getRawValue().addressLine1,
      addressLine2: this.form.getRawValue().addressLine2,
      city: this.form.getRawValue().city,
      state: this.form.getRawValue().state,
      postalCode: this.form.getRawValue().postalCode,
      notes: this.form.getRawValue().notes,
      shippingMethod: this.form.getRawValue().shippingMethod,
      paymentMethod: paymentMethodOverride ?? this.form.getRawValue().paymentMethod,
      confirmPriceUpdate: this.needsFinalPriceConfirmation(),
    };
  }

  async prepareStripeIfNeeded(force = false): Promise<void> {
    if (this.paymentMethod() !== 'card') return;
    if (this.stripeLoading()) return;
    if (!force && this.stripeReady()) return;
    if (!this.hasItems()) return;

    this.stripeInitAttempted.set(true);
    this.stripeLoading.set(true);
    this.submissionError.set(null);

    try {
      if (force) {
        this.destroyStripeElement();
      }

      const payload = this.buildCheckoutPayload('card');

      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.auth.getBearerToken() ? { Authorization: this.auth.getBearerToken()! } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || 'Unable to initialize Stripe payment.');
      }

      const data = (await response.json()) as {
        clientSecret: string;
        paymentIntentId: string;
        orderId: number;
      };

      this.stripeClientSecret.set(data.clientSecret);
      this.stripePaymentIntentId.set(data.paymentIntentId);
      this.stripeOrderId.set(data.orderId);

      const stripeBundle = await this.stripePaymentService.createPaymentElement(data.clientSecret);
      if (!stripeBundle) {
        throw new Error('Stripe initialization failed.');
      }

      this.stripe = stripeBundle.stripe;
      this.elements = stripeBundle.elements;
      this.paymentElement = stripeBundle.paymentElement;

      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      if (!this.paymentElementRef?.nativeElement) {
        throw new Error('Stripe container not found in template.');
      }

      if (!this.paymentElementMounted && this.paymentElement) {
        this.paymentElement.mount(this.paymentElementRef.nativeElement);
        this.paymentElementMounted = true;
      }

      this.stripeReady.set(true);
    } catch (error) {
      this.stripeReady.set(false);
      this.submissionError.set(
          error instanceof Error ? error.message : 'Unable to initialize secure payment form.'
      );
    } finally {
      this.stripeLoading.set(false);
    }
  }

  private destroyStripeElement(): void {
    if (this.paymentElement && this.paymentElementMounted) {
      try {
        this.paymentElement.destroy();
      } catch {
      }
    }

    this.paymentElement = null;
    this.elements = null;
    this.stripe = null;
    this.paymentElementMounted = false;
    this.stripeReady.set(false);
    this.stripeClientSecret.set(null);
    this.stripeOrderId.set(null);
    this.stripePaymentIntentId.set(null);
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.submissionError.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.hasItems()) {
      return;
    }

    if (this.paymentMethod() === 'invoice') {
      await this.submitInvoiceOrder();
      return;
    }

    await this.submitCardOrder();
  }

  private async submitInvoiceOrder(): Promise<void> {
    const cartId = this.cart.cartId();
    if (!cartId) {
      this.submissionError.set('Your cart session is no longer available. Please add your items again.');
      return;
    }

    this.placingOrder.set(true);

    try {
      const order = await this.orderService.checkout(this.buildCheckoutPayload('invoice'));

      this.placedTotal.set(order.totalAmount);
      this.orderNumber.set(`EP-${order.orderId}`);
      this.orderPlaced.set(true);
      this.needsFinalPriceConfirmation.set(false);

      await this.cart.refresh();

      this.ui.showToast?.({
        message: 'Order placed successfully.',
        type: 'success',
      });
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.needsFinalPriceConfirmation.set(true);
        this.submissionError.set('Final price updated, please review and click Place order again to confirm.');
        await this.cart.refresh();

        this.ui.showToast?.({
          message: 'Final price updated. Please confirm order.',
          type: 'warning',
        });
      } else {
        this.submissionError.set('Unable to place your order right now. Please make sure you are signed in and try again.');

        this.ui.showToast?.({
          message: 'Order placement failed.',
          type: 'error',
        });
      }
    } finally {
      this.placingOrder.set(false);
    }
  }

  private async submitCardOrder(): Promise<void> {
    if (!this.stripe || !this.elements) {
      await this.prepareStripeIfNeeded();
    }

    if (!this.stripe || !this.elements) {
      this.submissionError.set('Stripe is not ready.');
      return;
    }

    this.placingOrder.set(true);

    try {
      const { error } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          receipt_email: this.auth.userEmail() || this.form.getRawValue().email,
          payment_method_data: {
            billing_details: {
              name: this.form.getRawValue().fullName,
              email: this.auth.userEmail() || this.form.getRawValue().email,
              phone: this.form.getRawValue().phone,
              address: {
                line1: this.form.getRawValue().addressLine1,
                line2: this.form.getRawValue().addressLine2 || undefined,
                city: this.form.getRawValue().city,
                state: this.form.getRawValue().state,
                postal_code: this.form.getRawValue().postalCode,
                country: 'US',
              },
            },
          },
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        this.submissionError.set(error.message ?? 'Payment failed.');
        return;
      }

      this.orderPlaced.set(true);
      this.orderNumber.set(this.stripeOrderId() ? `EP-${this.stripeOrderId()}` : 'Processing...');
      this.placedTotal.set(this.orderTotal());
      this.needsFinalPriceConfirmation.set(false);

      await this.cart.refresh();

      this.ui.showToast?.({
        message: 'Payment confirmed. Your order is being finalized.',
        type: 'success',
      });
    } catch (error) {
      this.submissionError.set(
          error instanceof Error ? error.message : 'Unable to process payment.'
      );

      this.ui.showToast?.({
        message: 'Payment failed.',
        type: 'error',
      });
    } finally {
      this.placingOrder.set(false);
    }
  }

  startNewOrder(): void {
    this.orderPlaced.set(false);
    this.submitted.set(false);
    this.needsFinalPriceConfirmation.set(false);

    const defaultShippingMethod: ShippingMethod = this.auth.isOrganization()
        ? 'freight_shipping'
        : 'standard';

    this.form.reset({
      fullName: '',
      email: '',
      phone: '',
      company: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      notes: '',
      shippingMethod: defaultShippingMethod,
      paymentMethod: 'card',
    });

    this.shippingMethod.set(defaultShippingMethod);
    this.paymentMethod.set('card');
    this.destroyStripeElement();
    this.syncShippingValidators();

    queueMicrotask(() => {
      void this.prepareStripeIfNeeded(true);
    });
  }

  private syncShippingValidators(): void {
    const hideShipping = this.shouldHideShippingSection();

    const shippingFields = [
      this.form.controls.addressLine1,
      this.form.controls.city,
      this.form.controls.state,
      this.form.controls.postalCode,
    ];

    if (hideShipping) {
      this.form.controls.addressLine1.clearValidators();
      this.form.controls.city.clearValidators();
      this.form.controls.state.clearValidators();
      this.form.controls.postalCode.clearValidators();
    } else {
      this.form.controls.addressLine1.setValidators([Validators.required]);
      this.form.controls.city.setValidators([Validators.required]);
      this.form.controls.state.setValidators([Validators.required]);
      this.form.controls.postalCode.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Za-z0-9 -]{4,12}$/),
      ]);
    }

    shippingFields.forEach((control) => {
      control.updateValueAndValidity({ emitEvent: false });
    });
  }
}