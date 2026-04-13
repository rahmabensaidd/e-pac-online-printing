package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.epac.eprinting.model.enums.OrderValidationStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderLineValidationRequestDto {
    private OrderValidationStatus validationStatus;
}
