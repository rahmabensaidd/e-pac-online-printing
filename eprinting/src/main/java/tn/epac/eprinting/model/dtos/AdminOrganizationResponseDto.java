package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Value;
import tn.epac.eprinting.model.enums.OrganizationStatus;

import java.time.LocalDateTime;

@Value
@Builder
public class AdminOrganizationResponseDto {
    Long id;
    String name;
    String siren;
    OrganizationStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
