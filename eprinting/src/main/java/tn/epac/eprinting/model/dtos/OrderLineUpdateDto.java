// OrderLineUpdateDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Data;
@Data
public class OrderLineUpdateDto {
    private Long orderLineId;
    // CUSTOM: PENDING, PRINTING, READY_TO_SHIP, VALIDATED, REJECTED
    // MARKETPLACE: READY, READY_TO_SHIP
    private String status;
    private String priority;          // LOW, MEDIUM, HIGH (affichage)
}
