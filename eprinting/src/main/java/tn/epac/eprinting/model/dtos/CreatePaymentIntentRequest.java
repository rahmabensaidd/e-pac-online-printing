package tn.epac.eprinting.model.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreatePaymentIntentRequest {
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
    private Boolean confirmPriceUpdate;

    private String username;
    private List<String> roles;
}
