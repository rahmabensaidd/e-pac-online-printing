package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.model.dtos.*;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.serviceimpl.OrderServiceImpl;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderServiceImpl orderService;

    // ==================== ENDPOINTS ADMIN EXISTANTS ====================

    @GetMapping("/all")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<PagedResponseDto<AdminOrderResponseDto>> getAllOrdersAdmin(
            @PageableDefault(size = 20, sort = "orderDate") Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        Page<AdminOrderResponseDto> page = orderService.getAllOrdersAdmin(pageable, status, search);
        return ResponseEntity.ok(PagedResponseDto.from(page));
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<OrderStatsDto> getOrderStats() {
        return ResponseEntity.ok(orderService.getOrderStats());
    }

    @GetMapping("/admin/{orderId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminOrderResponseDto> getOrderByIdForAdmin(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getOrderByIdForAdmin(orderId));
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminOrderResponseDto> createOrder(@RequestBody OrderUpdateRequestDto request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PutMapping("/admin/{orderId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminOrderResponseDto> updateOrder(
            @PathVariable Long orderId,
            @RequestBody OrderUpdateRequestDto request
    ) {
        return ResponseEntity.ok(orderService.updateOrder(orderId, request));
    }

    @DeleteMapping("/admin/{orderId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long orderId) {
        orderService.deleteOrder(orderId);
        return ResponseEntity.noContent().build();
    }

    // ==================== NOUVEAUX ENDPOINTS POUR LE MODAL ÉLÉGANT ====================

    /**
     * Met à jour le statut global d'une commande (uniquement REJECTED, CANCELLED, SHIPPED)
     */
    @PatchMapping("/admin/{orderId}/status")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminOrderResponseDto> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestBody OrderStatusUpdateDto request
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, request.getStatus()));
    }

    /**
     * Met à jour plusieurs OrderLines en une seule requête
     * Permet de modifier le statut et/ou la priorité
     */
    @PatchMapping("/admin/{orderId}/orderlines")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminOrderResponseDto> updateOrderLines(
            @PathVariable Long orderId,
            @RequestBody BatchOrderLineUpdateDto request
    ) {
        return ResponseEntity.ok(orderService.updateOrderLines(orderId, request.getUpdates()));
    }

    @GetMapping("/admin/{orderId}/shipping/rates")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminShippingRatesResponseDto> getShippingRates(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getShippingRatesForAdmin(orderId));
    }

    @PostMapping("/admin/{orderId}/shipping/rate-selection")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminShipmentActionResponseDto> selectShippingRate(
            @PathVariable Long orderId,
            @RequestBody AdminSelectRateRequestDto request
    ) {
        Float amount = request != null && request.getAmount() != null ? request.getAmount().floatValue() : null;
        return ResponseEntity.ok(
                orderService.selectShippingRateForAdmin(
                        orderId,
                        request != null ? request.getRateId() : null,
                        request != null ? request.getCarrier() : null,
                        request != null ? request.getService() : null,
                        request != null ? request.getCurrency() : null,
                        amount
                )
        );
    }

    @PostMapping("/admin/{orderId}/shipping/ship")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminShipmentActionResponseDto> createShipment(
            @PathVariable Long orderId,
            @RequestBody(required = false) AdminCreateShipmentRequestDto request
    ) {
        String rateId = request != null ? request.getRateId() : null;
        String carrier = request != null ? request.getCarrier() : null;
        String service = request != null ? request.getService() : null;
        String currency = request != null ? request.getCurrency() : null;
        Float amount = request != null && request.getAmount() != null ? request.getAmount().floatValue() : null;
        boolean auto = request == null || request.getAutoSelect() == null || Boolean.TRUE.equals(request.getAutoSelect());
        boolean testShipment = request != null && Boolean.TRUE.equals(request.getTestShipment());
        return ResponseEntity.ok(orderService.createShipmentForAdmin(orderId, rateId, carrier, service, currency, amount, auto, testShipment));
    }

    @PostMapping("/admin/{orderId}/shipping/tracking/refresh")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminShipmentActionResponseDto> refreshShippingTracking(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.refreshShipmentTrackingForAdmin(orderId));
    }

    // ==================== ENDPOINTS DÉPRÉCIÉS (gardés pour compatibilité) ====================

    @PatchMapping("/admin/{orderId}/lines/{orderLineId}/validation")
    @PreAuthorize("hasRole('admin')")
    @Deprecated
    public ResponseEntity<AdminOrderResponseDto> updateOrderLineValidation(
            @PathVariable Long orderId,
            @PathVariable Long orderLineId,
            @RequestBody OrderLineValidationRequestDto request
    ) {
        return ResponseEntity.ok(orderService.updateOrderLineValidation(orderId, orderLineId, request.getValidationStatus()));
    }

    @PatchMapping("/admin/{orderId}/lines/{orderLineId}/production-status")
    @PreAuthorize("hasRole('admin')")
    @Deprecated
    public ResponseEntity<AdminOrderResponseDto> updateOrderLineProductionStatus(
            @PathVariable Long orderId,
            @PathVariable Long orderLineId,
            @RequestBody OrderLineProductionStatusRequestDto request
    ) {
        return ResponseEntity.ok(orderService.updateOrderLineProductionStatus(orderId, orderLineId, request.getLineStatus()));
    }

    // ==================== ENDPOINTS PUBLIC/USER ====================

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('user','admin','organization')")
    public ResponseEntity<OrderResponseDto> checkout(
            @RequestBody CheckoutOrderRequestDto request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        List<String> roles = List.of();
        Object rolesClaim = jwt.getClaim("roles");
        if (rolesClaim instanceof List<?> rawRoles) {
            roles = rawRoles.stream().map(String::valueOf).toList();
        }

        String email = jwt.getClaimAsString("email");
        String username = jwt.getClaimAsString("preferred_username");
        if ((username == null || username.isBlank()) && jwt.getSubject() != null) {
            username = jwt.getSubject();
        }
        if ((email == null || email.isBlank()) && username != null && !username.isBlank()) {
            email = username;
        }

        return ResponseEntity.ok(orderService.checkout(request.getCartId(), request, email, username, roles));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('user','admin','organization')")
    public ResponseEntity<List<OrderResponseDto>> getMyOrders(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt != null ? jwt.getClaimAsString("email") : null;
        String username = jwt != null ? jwt.getClaimAsString("preferred_username") : null;
        if ((username == null || username.isBlank()) && jwt != null) {
            username = jwt.getSubject();
        }
        return ResponseEntity.ok(orderService.getCurrentUserOrders(email, username));
    }

    @GetMapping("/my/{orderId}/tracking")
    @PreAuthorize("hasAnyRole('user','admin','organization')")
    public ResponseEntity<OrderTrackingResponseDto> getMyOrderTracking(
            @PathVariable Long orderId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String email = jwt != null ? jwt.getClaimAsString("email") : null;
        String username = jwt != null ? jwt.getClaimAsString("preferred_username") : null;
        if ((username == null || username.isBlank()) && jwt != null) {
            username = jwt.getSubject();
        }
        return ResponseEntity.ok(orderService.getTrackingForCurrentUser(orderId, email, username));
    }

    @PostMapping("/my/{orderId}/tracking/refresh")
    @PreAuthorize("hasAnyRole('user','admin','organization')")
    public ResponseEntity<OrderTrackingResponseDto> refreshMyOrderTracking(
            @PathVariable Long orderId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String email = jwt != null ? jwt.getClaimAsString("email") : null;
        String username = jwt != null ? jwt.getClaimAsString("preferred_username") : null;
        if ((username == null || username.isBlank()) && jwt != null) {
            username = jwt.getSubject();
        }
        return ResponseEntity.ok(orderService.refreshTrackingForCurrentUser(orderId, email, username));
    }

    @GetMapping("/shipping/options")
    @PreAuthorize("hasAnyRole('user','admin','organization')")
    public ResponseEntity<List<ShippingOptionDto>> getShippingOptions(
            @RequestParam(defaultValue = "0") float subtotal,
            @AuthenticationPrincipal Jwt jwt
    ) {
        boolean isOrganization = false;
        if (jwt != null) {
            Object rolesClaim = jwt.getClaim("roles");
            if (rolesClaim instanceof List<?> rawRoles) {
                isOrganization = rawRoles.stream().anyMatch(r -> "organization".equalsIgnoreCase(String.valueOf(r)));
            }
        }
        return ResponseEntity.ok(orderService.getShippingOptions(subtotal, isOrganization));
    }
}
