import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartItem, CartService } from '../../core/services/cart.service';

type ShippingMethod = 'standard' | 'express';
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
  | 'paymentMethod'
  | 'cardName'
  | 'cardNumber'
  | 'expiry'
  | 'cvc';

@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly cart = inject(CartService);

  readonly submitted = signal(false);
  readonly orderPlaced = signal(false);
  readonly orderNumber = signal('');
  readonly placedTotal = signal(0);

  readonly shippingMethod = signal<ShippingMethod>('standard');
  readonly paymentMethod = signal<PaymentMethod>('card');

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
    cardName: ['', [Validators.required]],
    cardNumber: ['', [Validators.required, Validators.pattern(/^(?:\d[ -]*?){13,19}$/)]],
    expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvc: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    saveCard: [false],
  });

  readonly hasItems = computed(() => this.cart.items().length > 0);
  readonly taxRate = 0.08;
  readonly shippingFee = computed(() => {
    if (!this.hasItems()) return 0;
    if (this.shippingMethod() === 'express') return 18;
    return this.cart.subtotal() >= 150 ? 0 : 8.5;
  });
  readonly taxAmount = computed(() => this.cart.subtotal() * this.taxRate);
  readonly orderTotal = computed(() => this.cart.subtotal() + this.shippingFee() + this.taxAmount());

  constructor() {
    this.form.controls.shippingMethod.valueChanges
      .pipe(startWith(this.form.controls.shippingMethod.value), takeUntilDestroyed())
      .subscribe((value) => {
        const method: ShippingMethod = value === 'express' ? 'express' : 'standard';
        this.shippingMethod.set(method);
      });

    this.form.controls.paymentMethod.valueChanges
      .pipe(startWith(this.form.controls.paymentMethod.value), takeUntilDestroyed())
      .subscribe((value) => {
        const method: PaymentMethod = value === 'invoice' ? 'invoice' : 'card';
        this.paymentMethod.set(method);
        this.syncPaymentValidators(method);
      });
  }

  showError(field: CheckoutField): boolean {
    const control = this.form.controls[field];
    return (this.submitted() || control.touched) && control.invalid;
  }

  lineTotal(item: CartItem): number {
    return item.product.price * item.quantity;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.hasItems()) {
      return;
    }

    this.placedTotal.set(this.orderTotal());
    this.orderNumber.set(`EP-${Date.now().toString().slice(-8)}`);
    this.orderPlaced.set(true);
    this.cart.clear();
  }

  startNewOrder(): void {
    this.orderPlaced.set(false);
    this.submitted.set(false);
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
      shippingMethod: 'standard',
      paymentMethod: 'card',
      cardName: '',
      cardNumber: '',
      expiry: '',
      cvc: '',
      saveCard: false,
    });
  }

  private syncPaymentValidators(method: PaymentMethod): void {
    const isCardPayment = method === 'card';

    if (isCardPayment) {
      this.form.controls.cardName.setValidators([Validators.required]);
      this.form.controls.cardNumber.setValidators([Validators.required, Validators.pattern(/^(?:\d[ -]*?){13,19}$/)]);
      this.form.controls.expiry.setValidators([Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]);
      this.form.controls.cvc.setValidators([Validators.required, Validators.pattern(/^\d{3,4}$/)]);
    } else {
      this.form.controls.cardName.clearValidators();
      this.form.controls.cardNumber.clearValidators();
      this.form.controls.expiry.clearValidators();
      this.form.controls.cvc.clearValidators();
    }

    this.form.controls.cardName.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cardNumber.updateValueAndValidity({ emitEvent: false });
    this.form.controls.expiry.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cvc.updateValueAndValidity({ emitEvent: false });
  }
}
