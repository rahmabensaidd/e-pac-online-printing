package tn.epac.eprinting.model.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OrganizationRegistrationRequestDto {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8)
    private String password;

    @NotBlank
    private String organizationName;

    @NotBlank
    private String siren;

    @NotBlank
    private String verificationToken;
}
