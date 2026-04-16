package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.epac.eprinting.model.dtos.ShipmentBookingRequest;
import tn.epac.eprinting.model.dtos.ShipmentBookingResult;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.Shipping;
import tn.epac.eprinting.model.enums.OrderLineStatus;
import tn.epac.eprinting.model.enums.ShippingMethod;
import tn.epac.eprinting.model.enums.ShippingStatus;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.service.ShippingBookingProvider;

@Slf4j
@Service
@RequiredArgsConstructor
public class DhlShippingService {

    private final ShippingBookingProvider dhlBookingProvider;
    private final OrderRepository orderRepository;

    /**
     * Vérifie si TOUTES les lignes sont READY_TO_SHIP et déclenche DHL
     */
    @Transactional
    public void checkAndTriggerDhlIfReady(Order order) {
        // 1. Déjà booké ? Ne pas refaire
        if (order.isDhlBooked()) {
            log.info("DHL déjà booké pour commande {}", order.getOrderId());
            return;
        }

        // 2. Est-ce une commande DHL ?
        if (!isDhlEligible(order)) {
            log.debug("Commande {} non éligible DHL", order.getOrderId());
            return;
        }

        // 3. TOUTES les lignes sont-elles READY_TO_SHIP ?
        if (!areAllLinesReadyToShip(order)) {
            log.info("Commande {} : toutes les lignes ne sont pas READY_TO_SHIP", order.getOrderId());
            return;
        }

        // 4. Déclencher DHL
        triggerDhlBooking(order);
    }

    private boolean isDhlEligible(Order order) {
        if (order.getShipping() == null) return false;
        ShippingMethod method = order.getShipping().getShippingMethod();
        return method == ShippingMethod.FREIGHTSHIPPING || method == ShippingMethod.FULLTRUCKLOAD_DHL;
    }

    private boolean areAllLinesReadyToShip(Order order) {
        if (order.getOrderLines() == null || order.getOrderLines().isEmpty()) {
            return false;
        }

        return order.getOrderLines().stream()
                .allMatch(line -> line.getLineStatus() == OrderLineStatus.READY_TO_SHIP);
    }

    private void triggerDhlBooking(Order order) {
        log.info("✅ TOUTES les lignes READY_TO_SHIP - Déclenchement DHL pour commande {}", order.getOrderId());

        Shipping shipping = order.getShipping();

        try {
            ShipmentBookingRequest bookingRequest = mapToBookingRequest(order);
            ShipmentBookingResult bookingResult = dhlBookingProvider.book(bookingRequest);

            if (!bookingResult.isSuccess()) {
                log.error("❌ Échec booking DHL pour commande {}", order.getOrderId());
                shipping.setShippingStatus(ShippingStatus.PENDING);
                shipping.setRawCarrierStatus("BOOKING_FAILED");
                orderRepository.save(order);
                return;
            }

            // Mise à jour avec les infos DHL
            shipping.setCarrier(bookingResult.getCarrier());
            shipping.setCarrierShipmentId(bookingResult.getCarrierShipmentId());
            shipping.setTrackingNumber(bookingResult.getTrackingNumber());
            shipping.setRawCarrierStatus(bookingResult.getRawStatus());
            shipping.setShippingStatus(ShippingStatus.SHIPPED);

            if (bookingResult.getEstimatedDelivery() != null) {
                shipping.setEstimatedDelivery(bookingResult.getEstimatedDelivery());
            }

            order.setDhlBooked(true);
            orderRepository.save(order);

            log.info("✅ DHL booké avec succès - Tracking: {}", bookingResult.getTrackingNumber());

        } catch (Exception e) {
            log.error("❌ Erreur booking DHL pour commande " + order.getOrderId(), e);
            shipping.setShippingStatus(ShippingStatus.PENDING);
            shipping.setRawCarrierStatus("BOOKING_ERROR: " + e.getMessage());
            orderRepository.save(order);
        }
    }

    private ShipmentBookingRequest mapToBookingRequest(Order order) {
        ShipmentBookingRequest request = new ShipmentBookingRequest();

        Shipping shipping = order.getShipping();
        var user = order.getUser();
        var address = shipping != null ? shipping.getShippingAddress() : null;

        request.setOrderId(order.getOrderId());
        request.setReference(order.getReference());
        request.setAccountId("DHL_ACCOUNT_ID");

        if (shipping != null && shipping.getShippingMethod() != null) {
            request.setShippingMethod(shipping.getShippingMethod().name());
            request.setServiceCode(resolveCarrierServiceCode(shipping.getShippingMethod()));
        }

        if (user != null) {
            String firstName = user.getFirstName() != null ? user.getFirstName() : "";
            String lastName = user.getLastName() != null ? user.getLastName() : "";
            request.setCompanyName(user.getCompanyName());
            request.setContactName((firstName + " " + lastName).trim());
            request.setEmail(user.getEmail());
            request.setPhone(user.getPhoneNumber() != null ? String.valueOf(user.getPhoneNumber()) : "");
        }

        if (address != null) {
            request.setStreet(address.getStreet());
            request.setCity(address.getCity());
            request.setPostalCode(address.getZipcode());
            request.setCountryCode(address.getCountryCode());
        }

        request.setPackagesCount(order.getOrderLines() != null ? order.getOrderLines().size() : 1);
        request.setTotalWeight(calculateTotalWeight(order));

        return request;
    }

    private String resolveCarrierServiceCode(ShippingMethod shippingMethod) {
        return switch (shippingMethod) {
            case FREIGHTSHIPPING -> "DHL_FREIGHT";
            case FULLTRUCKLOAD_DHL -> "DHL_FTL";
            default -> "STANDARD";
        };
    }

    private java.math.BigDecimal calculateTotalWeight(Order order) {
        if (order.getOrderLines() == null || order.getOrderLines().isEmpty()) {
            return java.math.BigDecimal.ONE;
        }

        double totalWeight = order.getOrderLines().stream()
                .mapToDouble(line -> {
                    int quantity = line.getQuantity() != null ? line.getQuantity() : 0;
                    double unitWeight = 0.5;
                    if (line.getBook() != null && line.getBook().getWeight() != null && line.getBook().getWeight() > 0) {
                        unitWeight = line.getBook().getWeight();
                    }
                    return quantity * unitWeight;
                })
                .sum();

        return totalWeight <= 0 ? java.math.BigDecimal.ONE : java.math.BigDecimal.valueOf(totalWeight);
    }
}