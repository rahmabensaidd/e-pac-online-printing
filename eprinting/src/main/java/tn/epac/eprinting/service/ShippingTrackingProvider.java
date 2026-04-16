package tn.epac.eprinting.service;

import tn.epac.eprinting.model.dtos.ShipmentTrackingResult;

public interface ShippingTrackingProvider {
    ShipmentTrackingResult track(String trackingNumber);
}
