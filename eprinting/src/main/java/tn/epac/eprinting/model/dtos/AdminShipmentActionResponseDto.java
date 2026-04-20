package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminShipmentActionResponseDto {
    private Long orderId;
    private String carrier;
    private String service;
    private String shippingStatus;
    private String trackingNumber;
    private String trackingUrl;
    private String carrierShipmentId;
    private String labelUrl;
    private String selectedRateId;
    private String rateCurrency;
    private Float rateAmount;
    private Boolean testShipment;
}
