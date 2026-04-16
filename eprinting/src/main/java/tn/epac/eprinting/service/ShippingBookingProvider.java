package tn.epac.eprinting.service;

public interface ShippingBookingProvider {
    ShipmentBookingResult book(ShipmentBookingRequest request);
}
