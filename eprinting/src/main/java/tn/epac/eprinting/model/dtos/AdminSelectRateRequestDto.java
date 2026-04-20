package tn.epac.eprinting.model.dtos;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AdminSelectRateRequestDto {
    private String rateId;
    private String carrier;
    private String service;
    private String currency;
    private BigDecimal amount;
}
