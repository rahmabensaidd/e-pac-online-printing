package tn.epac.eprinting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import tn.epac.eprinting.model.dtos.AdminOrganizationCreateRequestDto;
import tn.epac.eprinting.model.dtos.AdminOrganizationClientTrendsResponseDto;
import tn.epac.eprinting.model.dtos.AdminOrganizationResponseDto;
import tn.epac.eprinting.model.dtos.OrganizationVerificationTokenResponseDto;
import tn.epac.eprinting.serviceimpl.AdminOrganizationServiceImpl;

import java.util.List;

@RestController
@RequestMapping("/api/admin/organizations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
public class AdminOrganizationController {

    private final AdminOrganizationServiceImpl adminOrganizationService;

    @GetMapping
    public ResponseEntity<List<AdminOrganizationResponseDto>> getOrganizations() {
        return ResponseEntity.ok(adminOrganizationService.getOrganizations());
    }

    @GetMapping("/{organizationId}/client-trends")
    public ResponseEntity<AdminOrganizationClientTrendsResponseDto> getClientTrends(
            @PathVariable Long organizationId
    ) {
        return ResponseEntity.ok(adminOrganizationService.getClientTrends(organizationId));
    }

    @DeleteMapping("/{organizationId}")
    public ResponseEntity<Void> deleteOrganization(@PathVariable Long organizationId) {
        adminOrganizationService.deleteOrganization(organizationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<AdminOrganizationResponseDto> createOrganization(
            @Valid @RequestBody AdminOrganizationCreateRequestDto request
    ) {
        return ResponseEntity.ok(adminOrganizationService.createOrganization(request));
    }

    @PostMapping("/{organizationId}/verification-token")
    public ResponseEntity<OrganizationVerificationTokenResponseDto> generateVerificationToken(
            @PathVariable Long organizationId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                adminOrganizationService.generateVerificationToken(organizationId, extractAdminUserId(authentication))
        );
    }

    private Long extractAdminUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return null;
        }

        Object value = jwt.getClaim("user_id");
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
