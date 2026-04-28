package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutOrderRequestDto {
    private Long cartId;
    private String fullName;
    private String email;
    private String phone;
    private String company;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private String notes;
    private String shippingMethod;
    private String paymentMethod;
    private String stripePaymentIntentId;
    private Boolean paymentConfirmed;
    private Boolean confirmPriceUpdate;
}
