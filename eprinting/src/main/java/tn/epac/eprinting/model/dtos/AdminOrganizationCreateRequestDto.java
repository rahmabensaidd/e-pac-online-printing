package tn.epac.eprinting.model.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import tn.epac.eprinting.model.enums.OrganizationStatus;

@Data
public class AdminOrganizationCreateRequestDto {

    @NotBlank
    private String name;

    @NotBlank
    private String siren;

    private OrganizationStatus status = OrganizationStatus.ACTIVE;
}
