package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;
import tn.epac.eprinting.model.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class AdminUserOrderSummaryDto {
    private Long orderId;
    private String reference;
    private LocalDate orderDate;
    private OrderStatus status;
    private String priority;
    private BigDecimal totalAmount;
    private Integer items;
}
