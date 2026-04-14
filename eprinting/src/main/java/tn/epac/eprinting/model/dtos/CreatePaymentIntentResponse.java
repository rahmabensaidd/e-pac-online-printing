package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CreatePaymentIntentResponse {
    private String clientSecret;
    private String paymentIntentId;
    private Long orderId;
}