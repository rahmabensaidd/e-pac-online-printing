package tn.epac.eprinting.model.dtos;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class DhlFreightBookingResponse {
    private String shipmentId;
    private String status;
    private LocalDate estimatedDelivery;
    private String trackingNumber;
}