import { Injectable } from '@angular/core';
import {
    loadStripe,
    Stripe,
    StripeElements,
    StripePaymentElement,
    Appearance,
} from '@stripe/stripe-js';

@Injectable({
    providedIn: 'root',
})
export class StripePaymentService {
    private stripePromise = loadStripe(
        'pk_test_51RxSNnRveyiEnQT7vnZKRvSTi2FQTzPsggIP2SM0EY9bzTbVOHzEIFLbqqNa9ZydgBwXThOGRJxA2dIo2zPEVy6000XVfIDljN'
    );

    async getStripe(): Promise<Stripe | null> {
        return this.stripePromise;
    }

    async createPaymentElement(clientSecret: string, countryCode = 'FR'): Promise<{
        stripe: Stripe;
        elements: StripeElements;
        paymentElement: StripePaymentElement;
    } | null> {
        const stripe = await this.getStripe();
        if (!stripe) return null;

        const appearance: Appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#f97316',        // proche brand-orange
                colorText: '#10213a',           // proche brand-navy
                colorTextSecondary: '#6b7280',
                colorDanger: '#db2777',         // proche brand-pink
                colorBackground: '#ffffff',
                colorIcon: '#10213a',
                colorSuccess: '#0f766e',
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                fontSizeBase: '16px',
                spacingUnit: '4px',
                borderRadius: '16px',
            },
            rules: {
                '.Input': {
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    boxShadow: 'none',
                    padding: '12px 16px',
                },
                '.Input:focus': {
                    border: '1px solid #f97316',
                    boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.18)',
                },
                '.Input--invalid': {
                    border: '1px solid #db2777',
                    boxShadow: '0 0 0 4px rgba(219, 39, 119, 0.10)',
                },
                '.Label': {
                    color: '#10213a',
                    fontWeight: '700',
                    marginBottom: '8px',
                },
                '.Tab': {
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                },
                '.Tab:hover': {
                    color: '#10213a',
                },
                '.Tab--selected': {
                    borderColor: '#f97316',
                    boxShadow: '0 0 0 1px #f97316 inset',
                },
                '.Block': {
                    backgroundColor: '#ffffff',
                },
                '.CodeInput': {
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    boxShadow: 'none',
                },
            },
        };

        const elements = stripe.elements({
            clientSecret,
            locale: 'en',
            appearance,
        });

        const paymentElement = elements.create('payment', {
            layout: 'tabs',
            defaultValues: {
                billingDetails: {
                    address: {
                        country: countryCode,
                    },
                },
            },
            fields: {
                billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'auto',
                    address: 'auto',
                },
            },
        });

        return { stripe, elements, paymentElement };
    }
}
