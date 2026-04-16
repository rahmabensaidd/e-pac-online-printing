// OrderStatusUpdateDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Data;
import tn.epac.eprinting.model.enums.OrderStatus;

@Data
public class OrderStatusUpdateDto {
    private OrderStatus status;
}