package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.epac.eprinting.model.enums.OrderPriority;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.OrderValidationStatus;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponseDto {
    private Long orderId;
    private String reference;
    private LocalDate orderDate;
    private OrderStatus status;
    private OrderPriority priority;
    private OrderValidationStatus validationStatus;
    private String shippingMethod;
    private String shippingStatus;
    private String trackingNumber;
    private String trackingUrl;
    private String carrier;
    private Float totalAmount;
    private String customerEmail;
    private List<OrderLineResponseDto> items;
}
