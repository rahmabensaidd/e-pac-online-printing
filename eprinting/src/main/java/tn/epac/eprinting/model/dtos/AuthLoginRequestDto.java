package tn.epac.eprinting.model.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthLoginRequestDto {
    @NotBlank
    private String identifier;

    @NotBlank
    private String password;
}
