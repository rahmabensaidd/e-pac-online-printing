// OrderLineUpdateDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Data;
import tn.epac.eprinting.model.enums.OrderLineStatus;

@Data
public class OrderLineUpdateDto {
    private Long orderLineId;
    private OrderLineStatus status;  // READY, REJECTED, PRINTING, READY_TO_SHIP
    private String priority;          // LOW, MEDIUM, HIGH (affichage)
}