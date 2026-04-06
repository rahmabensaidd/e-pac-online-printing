package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderLineResponseDto {
    private Long orderLineId;
    private Long bookId;
    private String title;
    private Integer quantity;
    private Float unitPrice;
    private Float totalPrice;
}
