// BatchOrderLineUpdateDto.java
package tn.epac.eprinting.model.dtos;

import lombok.Data;
import java.util.List;

@Data
public class BatchOrderLineUpdateDto {
    private List<OrderLineUpdateDto> updates;
}