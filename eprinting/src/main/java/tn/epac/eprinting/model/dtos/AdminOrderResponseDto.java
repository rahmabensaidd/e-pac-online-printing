// tn.epac.eprinting.model.dtos.AdminOrderResponseDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class AdminOrderResponseDto {
    private Long orderId;
    private String reference;
    private String customerName;
    private String companyName;
    private String channel;
    private LocalDate submittedAt;
    private LocalDate dueDate;
    private BigDecimal total;
    private OrderStatus status;
    private String priority;
    private String assignee;
    private Integer items;
    private String shippingMethod;
    private PaymentStatus paymentStatus;
    private String notes;
    private List<OrderLineResponseDto> orderLines;
}