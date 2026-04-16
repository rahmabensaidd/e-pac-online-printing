package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class OrganizationVerificationTokenResponseDto {
    Long organizationId;
    String organizationName;
    String siren;
    String rawToken;
    LocalDateTime expiresAt;
}
