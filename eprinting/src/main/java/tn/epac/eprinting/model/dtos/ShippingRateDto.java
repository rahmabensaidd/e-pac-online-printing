package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingRateDto {
    private String rateId;
    private String carrierId;
    private String carrier;
    private String service;
    private String currency;
    private Float amount;
    private Integer estimatedDays;
    private boolean selected;
}

