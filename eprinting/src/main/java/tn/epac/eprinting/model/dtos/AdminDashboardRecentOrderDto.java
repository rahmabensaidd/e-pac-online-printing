package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class AdminDashboardRecentOrderDto {
    private Long orderId;
    private String reference;
    private String customerName;
    private String companyName;
    private LocalDate submittedAt;
    private LocalDate dueDate;
    private BigDecimal total;
    private String status;
    private String assignee;
    private Integer items;
    private String shippingMethod;
}
