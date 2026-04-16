package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class OrganizationRegistrationResponseDto {
    Long userId;
    Long organizationId;
    String message;
}
