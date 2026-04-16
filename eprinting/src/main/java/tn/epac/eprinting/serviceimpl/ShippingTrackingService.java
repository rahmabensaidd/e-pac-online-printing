package tn.epac.eprinting.serviceimpl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.epac.eprinting.model.dtos.ShipmentTrackingResult;
import tn.epac.eprinting.model.entities.Shipping;
import tn.epac.eprinting.repository.ShippingRepository;
import tn.epac.eprinting.service.ShippingTrackingProvider;

@Service
@RequiredArgsConstructor
public class ShippingTrackingService {

    private final ShippingRepository shippingRepository;
    private final ShippingTrackingProvider dhlTrackingProvider;

    @Transactional
    public void refreshTracking(Long shippingId) {
        Shipping shipping = shippingRepository.findById(shippingId)
                .orElseThrow(() -> new RuntimeException("Shipping not found"));

        if (shipping.getTrackingNumber() == null || shipping.getTrackingNumber().isBlank()) {
            return;
        }

        if (!"DHL".equalsIgnoreCase(shipping.getCarrier())) {
            return;
        }

        ShipmentTrackingResult result = dhlTrackingProvider.track(shipping.getTrackingNumber());

        shipping.setRawCarrierStatus(result.getRawCarrierStatus());
        shipping.setShippingStatus(result.getShippingStatus());

        if (result.getEstimatedDelivery() != null) {
            shipping.setEstimatedDelivery(result.getEstimatedDelivery());
        }

        shippingRepository.save(shipping);
    }
}
