// tn.epac.eprinting.model.dtos.OrderUpdateRequestDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderUpdateRequestDto {
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
}
