package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddPricedCustomItemRequestDto {
    private Long cartId;
    private Long bookId;
    private Integer quantity;
    private Float unitPrice;
    private Float totalPrice;
    private Boolean isEstimated;
    private String currency;
    private String calculatedAt;
}
