package tn.epac.eprinting.model.dtos;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ShipmentBookingRequest {
    private Long orderId;
    private String reference;
    private String accountId;
    private String shippingMethod;
    private String serviceCode;

    private String companyName;
    private String contactName;
    private String email;
    private String phone;

    private String street;
    private String city;
    private String postalCode;
    private String countryCode;

    private BigDecimal totalWeight;
    private Integer packagesCount;
}
