package tn.epac.eprinting.model.dtos;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class DhlShipmentDto {
    private String id;
    private String service;
    private String statusCode;
    private LocalDate estimatedDeliveryDate;
}
