package tn.epac.eprinting.model.dtos;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AdminCreateShipmentRequestDto {
    private String rateId;
    private String carrier;
    private String service;
    private String currency;
    private BigDecimal amount;
    private Boolean autoSelect;
    private Boolean testShipment;
}
