package tn.epac.eprinting.controller;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.serviceimpl.OrderServiceImpl;

@RestController
@RequestMapping("/api/payments")
public class StripeWebhookController {

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    private final OrderServiceImpl orderService;

    public StripeWebhookController(OrderServiceImpl orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader
    ) {
        Event event;

        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            System.out.println("❌ Invalid Stripe signature");
            return ResponseEntity.badRequest().body("Invalid signature");
        }

        System.out.println("✅ Stripe event received: " + event.getType());

        switch (event.getType()) {
            case "payment_intent.succeeded" -> {
                PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer()
                        .getObject()
                        .orElse(null);

                if (paymentIntent != null) {
                    String orderIdValue = paymentIntent.getMetadata().get("orderId");
                    System.out.println("✅ payment_intent.succeeded for paymentIntent = " + paymentIntent.getId());
                    System.out.println("✅ orderId from metadata = " + orderIdValue);

                    if (orderIdValue != null && !orderIdValue.isBlank()) {
                        Long orderId = Long.valueOf(orderIdValue);
                        orderService.markPaidFromStripe(paymentIntent.getId(), orderId);
                    }
                }
            }

            case "payment_intent.payment_failed" -> {
                PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer()
                        .getObject()
                        .orElse(null);

                if (paymentIntent != null) {
                    String orderIdValue = paymentIntent.getMetadata().get("orderId");
                    System.out.println("❌ payment_intent.payment_failed for paymentIntent = " + paymentIntent.getId());
                    System.out.println("❌ orderId from metadata = " + orderIdValue);

                    if (orderIdValue != null && !orderIdValue.isBlank()) {
                        Long orderId = Long.valueOf(orderIdValue);
                        orderService.markPaymentFailed(paymentIntent.getId(), orderId);
                    }
                }
            }
        }

        return ResponseEntity.ok("received");
    }
}