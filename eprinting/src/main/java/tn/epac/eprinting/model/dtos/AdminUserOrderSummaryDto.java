package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.ShippingMethod;
import tn.epac.eprinting.model.enums.ShippingStatus;

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
    private String orderType;
    private ShippingMethod shippingMethod;
    private ShippingStatus shippingStatus;
    private boolean invoiceAvailable;
}
