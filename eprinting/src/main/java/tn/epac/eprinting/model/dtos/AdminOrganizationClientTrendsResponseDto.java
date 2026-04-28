package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminOrganizationClientTrendsResponseDto {
    Long organizationId;
    String organizationName;
    String siren;
    Boolean found;
    String note;
    AdminOrganizationClientFeaturesDto features;
}
