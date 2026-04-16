// tn.epac.eprinting.model.dtos.OrderStatsDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class OrderStatsDto {
    private Long totalOrders;
    private Long pendingOrders;      // PENDING
    private Long processingOrders;   // PROCESSING
    private Long shippedOrders;      // SHIPPED
    private Long deliveredOrders;    // DELIVERED
    private Long cancelledOrders;    // CANCELLED
    private BigDecimal productionValue; // Valeur totale des commandes non livrées
}