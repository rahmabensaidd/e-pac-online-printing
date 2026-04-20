package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminShippingRatesResponseDto {
    private Long orderId;
    private String shippingMethod;
    private String selectedRateId;
    private String selectedService;
    private Boolean testMode;
    private Boolean ratesEnabled;
    private String informationMessage;
    private List<ShippingRateDto> rates;
}
