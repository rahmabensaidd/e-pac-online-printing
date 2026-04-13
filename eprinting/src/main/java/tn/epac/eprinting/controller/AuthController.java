package tn.epac.eprinting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.model.dtos.AuthLoginRequestDto;
import tn.epac.eprinting.model.dtos.AuthTokenResponseDto;
import tn.epac.eprinting.model.dtos.OrganizationRegistrationRequestDto;
import tn.epac.eprinting.model.dtos.OrganizationRegistrationResponseDto;
import tn.epac.eprinting.model.dtos.SignupRequestDto;
import tn.epac.eprinting.serviceimpl.AuthSignupService;
import tn.epac.eprinting.serviceimpl.OrganizationRegistrationServiceImpl;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthSignupService authSignupService;
    private final OrganizationRegistrationServiceImpl organizationRegistrationService;

    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> signup(@Valid @RequestBody SignupRequestDto request) {
        authSignupService.signup(request);
        return ResponseEntity.ok(Map.of("message", "Account created successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthTokenResponseDto> login(@Valid @RequestBody AuthLoginRequestDto request) {
        return ResponseEntity.ok(authSignupService.login(request));
    }

    @PostMapping("/register-organization")
    public ResponseEntity<OrganizationRegistrationResponseDto> registerOrganization(
            @Valid @RequestBody OrganizationRegistrationRequestDto request
    ) {
        return ResponseEntity.ok(organizationRegistrationService.registerOrganizationAccount(request));
    }
}
