package tn.epac.eprinting.model.dtos;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ShipmentBookingResult {
    private boolean success;
    private String carrier;
    private String carrierShipmentId;
    private String trackingNumber;
    private String rawStatus;
    private LocalDate estimatedDelivery;
}
