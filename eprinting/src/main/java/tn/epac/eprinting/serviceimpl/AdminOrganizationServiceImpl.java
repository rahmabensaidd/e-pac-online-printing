package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.AdminOrganizationCreateRequestDto;
import tn.epac.eprinting.model.dtos.AdminOrganizationResponseDto;
import tn.epac.eprinting.model.dtos.OrganizationVerificationTokenResponseDto;
import tn.epac.eprinting.model.entities.Organization;
import tn.epac.eprinting.model.entities.OrganizationVerificationToken;
import tn.epac.eprinting.model.enums.OrganizationStatus;
import tn.epac.eprinting.repository.OrganizationRepository;
import tn.epac.eprinting.repository.OrganizationVerificationTokenRepository;
import tn.epac.eprinting.util.OrganizationNormalizationUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminOrganizationServiceImpl {

    private final OrganizationRepository organizationRepository;
    private final OrganizationVerificationTokenRepository tokenRepository;
    private final OrganizationVerificationTokenService tokenService;

    public AdminOrganizationResponseDto createOrganization(AdminOrganizationCreateRequestDto request) {
        String normalizedSiren = OrganizationNormalizationUtils.normalizeSiren(request.getSiren());
        if (normalizedSiren.length() != 9) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SIREN must contain exactly 9 digits");
        }

        if (organizationRepository.existsByNormalizedSiren(normalizedSiren)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Organization already exists for this SIREN");
        }

        Organization organization = new Organization();
        organization.setName(request.getName().trim());
        organization.setNormalizedName(OrganizationNormalizationUtils.normalizeOrganizationName(request.getName()));
        organization.setSiren(request.getSiren().trim());
        organization.setNormalizedSiren(normalizedSiren);
        organization.setStatus(request.getStatus() == null ? OrganizationStatus.ACTIVE : request.getStatus());

        Organization savedOrganization = organizationRepository.save(organization);
        return toDto(savedOrganization);
    }

    public OrganizationVerificationTokenResponseDto generateVerificationToken(Long organizationId, Long createdByAdminId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        String rawToken = tokenService.generateRawToken();
        OrganizationVerificationToken token = new OrganizationVerificationToken();
        token.setOrganization(organization);
        token.setTokenHash(tokenService.hashToken(rawToken));
        token.setExpiresAt(tokenService.calculateExpiryDate());
        token.setActive(Boolean.TRUE);
        token.setCreatedByAdminId(createdByAdminId);
        OrganizationVerificationToken savedToken = tokenRepository.save(token);

        return OrganizationVerificationTokenResponseDto.builder()
                .organizationId(organization.getId())
                .organizationName(organization.getName())
                .siren(organization.getSiren())
                .rawToken(rawToken)
                .expiresAt(savedToken.getExpiresAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<AdminOrganizationResponseDto> getOrganizations() {
        return organizationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    private AdminOrganizationResponseDto toDto(Organization organization) {
        return AdminOrganizationResponseDto.builder()
                .id(organization.getId())
                .name(organization.getName())
                .siren(organization.getSiren())
                .status(organization.getStatus())
                .createdAt(organization.getCreatedAt())
                .updatedAt(organization.getUpdatedAt())
                .build();
    }
}
