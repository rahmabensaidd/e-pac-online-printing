package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponseDto {
    private Long orderLineId;
    private Long bookId;
    private String title;
    private String description;
    private String bindingType;
    private String itemSource;
    private Integer quantity;
    private Float unitPrice;
    private Float lineTotal;
    private Boolean isEstimated;
    private String currency;
    private String calculatedAt;
}
