package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OrderStatsDto {
    private Long totalOrders;
    private Long pendingOrders;
    private Long processingOrders;
    private Long readyToShipOrders;
    private Long shippedOrders;
    private Long deliveredOrders;
    private Long cancelledOrders;
    private Long rejectedOrders;
    private BigDecimal productionValue;
}
