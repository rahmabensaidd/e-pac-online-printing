package tn.epac.eprinting.model.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminUserRoleUpdateRequestDto {
    @NotBlank
    private String role;
}

