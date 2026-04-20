// tn.epac.eprinting.controller.AdminOrderController.java
package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.model.dtos.*;
import tn.epac.eprinting.serviceimpl.OrderServiceImpl;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
public class AdminOrderController {

    private final OrderServiceImpl orderService;

    /**
     * Get all orders with pagination and filtering
     * GET /api/admin/orders?status=PENDING&search=ORD&page=0&size=10
     */
    @GetMapping
    public ResponseEntity<PagedResponseDto<AdminOrderResponseDto>> getAllOrders(
            @PageableDefault(size = 10, sort = "orderId") Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        Page<AdminOrderResponseDto> orders = orderService.getAllOrdersAdmin(pageable, status, search);
        return ResponseEntity.ok(PagedResponseDto.from(orders));
    }

    /**
     * Get order by ID
     * GET /api/admin/orders/{orderId}
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<AdminOrderResponseDto> getOrderById(@PathVariable Long orderId) {
        AdminOrderResponseDto order = orderService.getOrderByIdForAdmin(orderId);
        return ResponseEntity.ok(order);
    }

    /**
     * Create new order (admin manual creation)
     * POST /api/admin/orders
     */
    @PostMapping
    public ResponseEntity<AdminOrderResponseDto> createOrder(@RequestBody OrderUpdateRequestDto request) {
        AdminOrderResponseDto createdOrder = orderService.createOrder(request);
        return new ResponseEntity<>(createdOrder, HttpStatus.CREATED);
    }

    /**
     * Update existing order
     * PUT /api/admin/orders/{orderId}
     */
    @PutMapping("/{orderId}")
    public ResponseEntity<AdminOrderResponseDto> updateOrder(
            @PathVariable Long orderId,
            @RequestBody OrderUpdateRequestDto request
    ) {
        AdminOrderResponseDto updatedOrder = orderService.updateOrder(orderId, request);
        return ResponseEntity.ok(updatedOrder);
    }

    /**
     * Delete order
     * DELETE /api/admin/orders/{orderId}
     */
    @DeleteMapping("/{orderId}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long orderId) {
        orderService.deleteOrder(orderId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get order statistics for dashboard
     * GET /api/admin/orders/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<OrderStatsDto> getOrderStats() {
        OrderStatsDto stats = orderService.getOrderStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/{orderId}/shipping/rates")
    public ResponseEntity<AdminShippingRatesResponseDto> getShippingRates(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getShippingRatesForAdmin(orderId));
    }

    @PostMapping("/{orderId}/shipping/rate-selection")
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

    @PostMapping("/{orderId}/shipping/ship")
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
        return ResponseEntity.ok(
                orderService.createShipmentForAdmin(orderId, rateId, carrier, service, currency, amount, auto, testShipment)
        );
    }

    @PostMapping("/{orderId}/shipping/tracking/refresh")
    public ResponseEntity<AdminShipmentActionResponseDto> refreshTracking(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.refreshShipmentTrackingForAdmin(orderId));
    }
}
