// tn.epac.eprinting.model.dtos.AdminOrderResponseDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.PaymentStatus;
import tn.epac.eprinting.model.enums.OrderValidationStatus;

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
    private OrderValidationStatus validationStatus;
    private String priority;
    private String assignee;
    private Integer items;
    private String shippingMethod;
    private String shippingStatus;
    private String trackingNumber;
    private String trackingUrl;
    private String carrier;
    private String labelUrl;
    private String selectedRateId;
    private String selectedRateService;
    private String selectedRateCurrency;
    private Float selectedRateAmount;
    private Boolean testShipment;
    private PaymentStatus paymentStatus;
    private String notes;
    private List<OrderLineResponseDto> orderLines;
}
