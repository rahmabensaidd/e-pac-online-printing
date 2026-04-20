package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.epac.eprinting.model.enums.OrderPriority;
import tn.epac.eprinting.model.enums.OrderStatus;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderTrackingResponseDto {
    private Long orderId;
    private String orderNumber;
    private LocalDate orderDate;
    private OrderPriority priority;
    private OrderStatus globalStatus;
    private String shippingMethod;
    private String shippingStatus;
    private String carrier;
    private String trackingNumber;
    private String trackingUrl;
    private Boolean testShipment;
    private List<ProductionLineDto> productionLines;
    private List<ShippingLineDto> shippingLines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductionLineDto {
        private Long orderLineId;
        private Long bookId;
        private String bookTitle;
        private String type;
        private Integer quantity;
        private String productionStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShippingLineDto {
        private Long orderLineId;
        private Long bookId;
        private String bookTitle;
        private String type;
        private Integer quantity;
        private String productionStatus;
        private Float unitPrice;
        private Float totalPrice;
        private Boolean estimatedPrice;
    }
}
