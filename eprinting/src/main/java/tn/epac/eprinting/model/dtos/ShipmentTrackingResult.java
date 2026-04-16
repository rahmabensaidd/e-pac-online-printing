package tn.epac.eprinting.model.dtos;



import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.ShippingStatus;

import java.time.LocalDate;

@Getter
@Setter
public class ShipmentTrackingResult {

    private boolean found;

    private String carrier; // DHL

    private String trackingNumber;

    private String rawCarrierStatus; // statut brut DHL

    private ShippingStatus shippingStatus; // statut normalisé interne

    private LocalDate estimatedDelivery;
}
