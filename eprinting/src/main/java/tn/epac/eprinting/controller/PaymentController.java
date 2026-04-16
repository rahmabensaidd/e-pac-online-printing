package tn.epac.eprinting.controller;

import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.model.dtos.CreatePaymentIntentRequest;
import tn.epac.eprinting.model.dtos.CreatePaymentIntentResponse;
import tn.epac.eprinting.serviceimpl.StripePaymentService;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final StripePaymentService stripePaymentService;

    @PostMapping("/create-intent")
    public ResponseEntity<CreatePaymentIntentResponse> createIntent(
            @RequestBody CreatePaymentIntentRequest request
    ) throws StripeException {
        CreatePaymentIntentResponse response = stripePaymentService.createPaymentIntent(request);
        return ResponseEntity.ok(response);
    }
}