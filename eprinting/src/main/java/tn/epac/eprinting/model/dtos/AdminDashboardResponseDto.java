package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class AdminDashboardResponseDto {
    private Long totalOrders;
    private Long openOrders;
    private Long pendingOrders;
    private Long processingOrders;
    private Long readyToShipOrders;
    private Long shippedOrders;
    private Long deliveredOrders;
    private Long cancelledOrders;
    private Long rejectedOrders;
    private BigDecimal productionValue;
    private Long lowStockItems;
    private Integer activeEmployees;
    private Integer totalEmployees;
    private List<AdminDashboardFocusAreaDto> focusAreas;
    private List<AdminDashboardDeliveryLaneDto> deliveryMix;
    private List<AdminDashboardAlertDto> attentionItems;
    private List<AdminDashboardActivityDto> recentActivity;
    private List<AdminDashboardRecentOrderDto> recentOrders;
}
