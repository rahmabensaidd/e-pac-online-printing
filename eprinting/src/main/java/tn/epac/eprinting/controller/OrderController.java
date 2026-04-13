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
import tn.epac.eprinting.model.dtos.AdminOrderResponseDto;
import tn.epac.eprinting.model.dtos.CheckoutOrderRequestDto;
import tn.epac.eprinting.model.dtos.OrderLineProductionStatusRequestDto;
import tn.epac.eprinting.model.dtos.OrderLineValidationRequestDto;
import tn.epac.eprinting.model.dtos.OrderResponseDto;
import tn.epac.eprinting.model.dtos.OrderStatsDto;
import tn.epac.eprinting.model.dtos.OrderTrackingResponseDto;
import tn.epac.eprinting.model.dtos.OrderUpdateRequestDto;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.serviceimpl.OrderServiceImpl;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderServiceImpl orderService;


    // ✅ Accessible uniquement aux admins
    @GetMapping("/all")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<List<Order>> getAllOrders() {
        List<Order> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Page<AdminOrderResponseDto>> getAllOrdersAdmin(
            @PageableDefault(size = 20, sort = "orderDate") Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(orderService.getAllOrdersAdmin(pageable, status, search));
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

    @PatchMapping("/admin/{orderId}/lines/{orderLineId}/validation")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminOrderResponseDto> updateOrderLineValidation(
            @PathVariable Long orderId,
            @PathVariable Long orderLineId,
            @RequestBody OrderLineValidationRequestDto request
    ) {
        return ResponseEntity.ok(orderService.updateOrderLineValidation(orderId, orderLineId, request.getValidationStatus()));
    }

    @PatchMapping("/admin/{orderId}/lines/{orderLineId}/production-status")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AdminOrderResponseDto> updateOrderLineProductionStatus(
            @PathVariable Long orderId,
            @PathVariable Long orderLineId,
            @RequestBody OrderLineProductionStatusRequestDto request
    ) {
        return ResponseEntity.ok(orderService.updateOrderLineProductionStatus(orderId, orderLineId, request.getLineStatus()));
    }
}
