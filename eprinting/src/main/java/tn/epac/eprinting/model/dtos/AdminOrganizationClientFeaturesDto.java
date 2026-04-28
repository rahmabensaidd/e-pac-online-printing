package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminOrganizationClientFeaturesDto {
    String siren;
    Integer clientNbOrders;
    Double clientAvgPriceHt;
    Double clientPriceStdHt;
    Double clientAvgQuantity;
    Double clientPriceVolatility;
    Double clientRelativePrice;
    String clientFirstOrder;
    String clientLastOrder;
    Double clientSeniorityYears;
    Integer clientRecencyDays;
    Double clientPriceElasticity;
    String elasticityStatus;
}
