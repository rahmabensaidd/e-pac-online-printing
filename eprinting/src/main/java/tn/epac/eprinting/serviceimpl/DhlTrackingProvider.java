package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tn.epac.eprinting.model.dtos.DhlShipmentDto;
import tn.epac.eprinting.model.dtos.DhlTrackingResponse;
import tn.epac.eprinting.model.dtos.ShipmentTrackingResult;
import tn.epac.eprinting.model.enums.ShippingStatus;
import tn.epac.eprinting.service.ShippingTrackingProvider;

@Service
@RequiredArgsConstructor
public class DhlTrackingProvider implements ShippingTrackingProvider {
    private final WebClient dhlTrackingWebClient;

    @Value("${dhl.tracking.api-key}")
    private String apiKey;

    @Override
    public ShipmentTrackingResult track(String trackingNumber) {
        DhlTrackingResponse response = dhlTrackingWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/track/shipments")
                        .queryParam("trackingNumber", trackingNumber)
                        .build())
                .header("DHL-API-Key", apiKey)
                .retrieve()
                .bodyToMono(DhlTrackingResponse.class)
                .block();

        return mapResponse(response, trackingNumber);
    }

    private ShipmentTrackingResult mapResponse(DhlTrackingResponse response, String trackingNumber) {
        ShipmentTrackingResult result = new ShipmentTrackingResult();
        result.setTrackingNumber(trackingNumber);

        if (response == null || response.getShipments() == null || response.getShipments().isEmpty()) {
            result.setFound(false);
            result.setShippingStatus(ShippingStatus.PENDING);
            return result;
        }

        DhlShipmentDto shipment = response.getShipments().get(0);
        result.setFound(true);
        result.setRawCarrierStatus(shipment.getStatusCode());
        result.setShippingStatus(mapDhlStatus(shipment.getStatusCode()));
        result.setEstimatedDelivery(shipment.getEstimatedDeliveryDate());
        result.setCarrier("DHL");
        return result;
    }

    private ShippingStatus mapDhlStatus(String dhlStatus) {
        if (dhlStatus == null) {
            return ShippingStatus.PENDING;
        }

        String normalized = dhlStatus.trim().toUpperCase();

        return switch (normalized) {
            case "PRE_TRANSIT", "BOOKING_RECEIVED", "PICKUP_SCHEDULED", "PENDING" -> ShippingStatus.PROCESSING;
            case "SHIPPED" -> ShippingStatus.SHIPPED;
            case "TRANSIT", "IN_TRANSIT", "WITH_DELIVERY_COURIER" -> ShippingStatus.IN_TRANSIT;
            case "DELIVERED", "OK" -> ShippingStatus.DELIVERED;
            case "RETURNED", "RETURN_TO_SENDER" -> ShippingStatus.RETURNED;
            default -> ShippingStatus.PENDING;
        };
    }
}