package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.epac.eprinting.model.dtos.AdminDashboardActivityDto;
import tn.epac.eprinting.model.dtos.AdminDashboardAlertDto;
import tn.epac.eprinting.model.dtos.AdminDashboardDeliveryLaneDto;
import tn.epac.eprinting.model.dtos.AdminDashboardFocusAreaDto;
import tn.epac.eprinting.model.dtos.AdminDashboardRecentOrderDto;
import tn.epac.eprinting.model.dtos.AdminDashboardResponseDto;
import tn.epac.eprinting.model.dtos.AdminOrderResponseDto;
import tn.epac.eprinting.model.dtos.BookResponseDto;
import tn.epac.eprinting.model.dtos.OrderStatsDto;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.model.enums.ShippingMethod;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardServiceImpl {

    private static final DateTimeFormatter DATE_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MMM d");

    private final OrderServiceImpl orderService;
    private final OrderRepository orderRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;

    public AdminDashboardResponseDto getDashboard() {
        OrderStatsDto stats = orderService.getOrderStats();
        List<AdminOrderResponseDto> recentOrders = orderService
                .getAllOrdersAdmin(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "orderDate", "orderId")), null, null)
                .getContent();

        List<Book> lowStockBooks = bookRepository.findByQuantityLessThan(10);
        int activeEmployees = userRepository.findByRole(Role.ADMIN).size()
                + userRepository.findByRole(Role.MODERATOR).size();
        int totalEmployees = Math.max(activeEmployees, 1);

        long standardOrders = orderRepository.countByShippingShippingMethod(ShippingMethod.STANDARD);
        long freightOrders = orderRepository.countByShippingShippingMethod(ShippingMethod.FREIGHTSHIPPING);
        long fullTruckLoadOrders = orderRepository.countByShippingShippingMethod(ShippingMethod.FULLTRUCKLOAD_DHL);
        long openOrders = safe(stats.getPendingOrders())
                + safe(stats.getProcessingOrders())
                + safe(stats.getReadyToShipOrders())
                + safe(stats.getShippedOrders());

        return AdminDashboardResponseDto.builder()
                .totalOrders(safe(stats.getTotalOrders()))
                .openOrders(openOrders)
                .pendingOrders(safe(stats.getPendingOrders()))
                .processingOrders(safe(stats.getProcessingOrders()))
                .readyToShipOrders(safe(stats.getReadyToShipOrders()))
                .shippedOrders(safe(stats.getShippedOrders()))
                .deliveredOrders(safe(stats.getDeliveredOrders()))
                .cancelledOrders(safe(stats.getCancelledOrders()))
                .rejectedOrders(safe(stats.getRejectedOrders()))
                .productionValue(stats.getProductionValue() == null ? BigDecimal.ZERO : stats.getProductionValue())
                .lowStockItems((long) lowStockBooks.size())
                .activeEmployees(activeEmployees)
                .totalEmployees(totalEmployees)
                .focusAreas(buildFocusAreas(stats, activeEmployees))
                .deliveryMix(buildDeliveryMix(standardOrders, freightOrders, fullTruckLoadOrders))
                .attentionItems(buildAttentionItems(stats, lowStockBooks.size()))
                .recentActivity(buildRecentActivity(recentOrders, lowStockBooks))
                .recentOrders(recentOrders.stream().map(this::mapRecentOrder).toList())
                .build();
    }

    private List<AdminDashboardFocusAreaDto> buildFocusAreas(OrderStatsDto stats, int activeEmployees) {
        return List.of(
                AdminDashboardFocusAreaDto.builder()
                        .label("Pending")
                        .value(safe(stats.getPendingOrders()) + " jobs")
                        .hint("Waiting for production start")
                        .build(),
                AdminDashboardFocusAreaDto.builder()
                        .label("Ready to ship")
                        .value(safe(stats.getReadyToShipOrders()) + " jobs")
                        .hint("Can move today")
                        .build(),
                AdminDashboardFocusAreaDto.builder()
                        .label("Live operators")
                        .value(String.valueOf(activeEmployees))
                        .hint("Backoffice staff accounts")
                        .build()
        );
    }

    private List<AdminDashboardDeliveryLaneDto> buildDeliveryMix(long standardOrders, long freightOrders, long fullTruckLoadOrders) {
        return List.of(
                AdminDashboardDeliveryLaneDto.builder().label("Standard").value(standardOrders).build(),
                AdminDashboardDeliveryLaneDto.builder().label("Freight").value(freightOrders).build(),
                AdminDashboardDeliveryLaneDto.builder().label("Full truckload").value(fullTruckLoadOrders).build()
        );
    }

    private List<AdminDashboardAlertDto> buildAttentionItems(OrderStatsDto stats, int lowStockItems) {
        List<AdminDashboardAlertDto> items = new ArrayList<>();

        if (safe(stats.getPendingOrders()) > 0) {
            items.add(AdminDashboardAlertDto.builder()
                    .id("alert-pending")
                    .title(safe(stats.getPendingOrders()) + " pending order" + pluralize(safe(stats.getPendingOrders())))
                    .description("Orders are waiting for production start or review.")
                    .route("/backoffice/orders")
                    .tone("warning")
                    .build());
        }

        if (lowStockItems > 0) {
            items.add(AdminDashboardAlertDto.builder()
                    .id("alert-stock")
                    .title(lowStockItems + " low stock item" + pluralize(lowStockItems))
                    .description("Inventory thresholds need attention before the queue grows.")
                    .route("/backoffice/inventory")
                    .tone("danger")
                    .build());
        }

        if (safe(stats.getReadyToShipOrders()) > 0) {
            items.add(AdminDashboardAlertDto.builder()
                    .id("alert-ready")
                    .title(safe(stats.getReadyToShipOrders()) + " order" + pluralize(safe(stats.getReadyToShipOrders())) + " ready to ship")
                    .description("Labels and dispatch can be prepared now.")
                    .route("/backoffice/orders")
                    .tone("positive")
                    .build());
        }

        if (items.isEmpty()) {
            items.add(AdminDashboardAlertDto.builder()
                    .id("alert-clear")
                    .title("Operations look clear")
                    .description("No urgent inventory or queue blockers were detected.")
                    .route("/backoffice/orders")
                    .tone("neutral")
                    .build());
        }

        return items.stream().limit(3).toList();
    }

    private List<AdminDashboardActivityDto> buildRecentActivity(List<AdminOrderResponseDto> recentOrders, List<Book> lowStockBooks) {
        List<AdminDashboardActivityDto> items = new ArrayList<>();

        if (!recentOrders.isEmpty()) {
            AdminOrderResponseDto newestOrder = recentOrders.get(0);
            items.add(AdminDashboardActivityDto.builder()
                    .id("activity-order-" + newestOrder.getOrderId())
                    .title("Order " + defaultString(newestOrder.getReference(), "#" + newestOrder.getOrderId()) + " updated")
                    .description(defaultString(newestOrder.getCompanyName(), newestOrder.getCustomerName()) + " is currently in "
                            + humanizeOrderStatus(newestOrder.getStatus() != null ? newestOrder.getStatus().name() : null) + ".")
                    .timestamp(formatDateLabel(newestOrder.getSubmittedAt()))
                    .route("/backoffice/order-details/" + newestOrder.getOrderId())
                    .tone(resolveTone(newestOrder.getStatus() != null ? newestOrder.getStatus().name() : null))
                    .icon("fa-receipt")
                    .build());
        }

        if (recentOrders.size() > 1) {
            AdminOrderResponseDto secondOrder = recentOrders.get(1);
            items.add(AdminDashboardActivityDto.builder()
                    .id("activity-queue-" + secondOrder.getOrderId())
                    .title("Queue moved for " + defaultString(secondOrder.getReference(), "#" + secondOrder.getOrderId()))
                    .description("Assigned to " + defaultString(secondOrder.getAssignee(), "the operations team") + ".")
                    .timestamp(formatDateLabel(secondOrder.getSubmittedAt()))
                    .route("/backoffice/order-details/" + secondOrder.getOrderId())
                    .tone("neutral")
                    .icon("fa-layer-group")
                    .build());
        }

        if (!lowStockBooks.isEmpty()) {
            Book book = lowStockBooks.get(0);
            items.add(AdminDashboardActivityDto.builder()
                    .id("activity-stock-" + book.getBookId())
                    .title("Low stock watch")
                    .description(defaultString(book.getTitle(), "A book") + " is below the target quantity.")
                    .timestamp("Inventory")
                    .route("/backoffice/inventory")
                    .tone("warning")
                    .icon("fa-box-open")
                    .build());
        }

        return items;
    }

    private AdminDashboardRecentOrderDto mapRecentOrder(AdminOrderResponseDto order) {
        return AdminDashboardRecentOrderDto.builder()
                .orderId(order.getOrderId())
                .reference(order.getReference())
                .customerName(order.getCustomerName())
                .companyName(order.getCompanyName())
                .submittedAt(order.getSubmittedAt())
                .dueDate(order.getDueDate())
                .total(order.getTotal())
                .status(order.getStatus() != null ? humanizeOrderStatus(order.getStatus().name()) : "Pending")
                .assignee(order.getAssignee())
                .items(order.getItems())
                .shippingMethod(humanizeShippingMethod(order.getShippingMethod()))
                .build();
    }

    private long safe(Long value) {
        return value == null ? 0L : value;
    }

    private String pluralize(long value) {
        return value > 1 ? "s" : "";
    }

    private String defaultString(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    private String formatDateLabel(LocalDate date) {
        if (date == null) {
            return "Recently";
        }
        if (LocalDate.now().equals(date)) {
            return "Today";
        }
        return DATE_LABEL_FORMATTER.format(date);
    }

    private String humanizeOrderStatus(String status) {
        if (status == null || status.isBlank()) {
            return "Pending";
        }
        return switch (status) {
            case "IN_PRODUCTION" -> "In production";
            case "READY_TO_SHIP" -> "Ready to ship";
            case "SHIPPED" -> "Shipped";
            case "DELIVERED" -> "Delivered";
            case "CANCELLED" -> "Cancelled";
            case "REJECTED" -> "Rejected";
            default -> "Pending";
        };
    }

    private String humanizeShippingMethod(String shippingMethod) {
        if (shippingMethod == null || shippingMethod.isBlank()) {
            return "Standard";
        }
        return switch (shippingMethod.toUpperCase()) {
            case "FREIGHTSHIPPING", "FREIGHT_SHIPPING" -> "Freight";
            case "FULLTRUCKLOAD_DHL", "FULL_TRUCKLOAD", "FULLTRUCKLOAD" -> "Full truckload";
            default -> "Standard";
        };
    }

    private String resolveTone(String status) {
        if (status == null) {
            return "neutral";
        }
        return switch (status) {
            case "READY_TO_SHIP", "DELIVERED" -> "positive";
            case "REJECTED", "CANCELLED" -> "danger";
            case "PENDING" -> "warning";
            default -> "neutral";
        };
    }
}
