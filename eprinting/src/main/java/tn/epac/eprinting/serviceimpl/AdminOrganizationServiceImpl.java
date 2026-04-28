package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.client.PricingApiClient;
import tn.epac.eprinting.model.dtos.AdminOrganizationClientFeaturesDto;
import tn.epac.eprinting.model.dtos.AdminOrganizationClientTrendsResponseDto;
import tn.epac.eprinting.model.dtos.AdminOrganizationCreateRequestDto;
import tn.epac.eprinting.model.dtos.AdminOrganizationResponseDto;
import tn.epac.eprinting.model.dtos.OrganizationVerificationTokenResponseDto;
import tn.epac.eprinting.model.entities.Organization;
import tn.epac.eprinting.model.entities.OrganizationVerificationToken;
import tn.epac.eprinting.model.enums.OrganizationStatus;
import tn.epac.eprinting.repository.OrganizationMembershipRepository;
import tn.epac.eprinting.repository.OrganizationRepository;
import tn.epac.eprinting.repository.OrganizationVerificationTokenRepository;
import tn.epac.eprinting.util.OrganizationNormalizationUtils;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminOrganizationServiceImpl {

    private final OrganizationRepository organizationRepository;
    private final OrganizationVerificationTokenRepository tokenRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationVerificationTokenService tokenService;
    private final PricingApiClient pricingApiClient;

    public AdminOrganizationResponseDto createOrganization(AdminOrganizationCreateRequestDto request) {
        String normalizedSiren = OrganizationNormalizationUtils.normalizeSiren(request.getSiren());
        if (normalizedSiren.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SIREN is required");
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

    public void deleteOrganization(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        if (membershipRepository.existsByOrganization(organization)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This organization cannot be deleted because it is already linked to members"
            );
        }

        tokenRepository.deleteByOrganization(organization);
        organizationRepository.delete(organization);
    }

    @Transactional(readOnly = true)
    public AdminOrganizationClientTrendsResponseDto getClientTrends(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        Map<String, Object> response;
        try {
            response = pricingApiClient.getClientFeatures(organization.getSiren());
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Client trends service unavailable");
        }

        Map<String, Object> featuresMap = getMap(response.get("features"));
        return AdminOrganizationClientTrendsResponseDto.builder()
                .organizationId(organization.getId())
                .organizationName(organization.getName())
                .siren(readString(response.get("siren"), organization.getSiren()))
                .found(readBoolean(response.get("found")))
                .note("These client trend metrics are dynamic and can evolve as order history changes.")
                .features(featuresMap == null ? null : AdminOrganizationClientFeaturesDto.builder()
                        .siren(readString(featuresMap.get("siren"), organization.getSiren()))
                        .clientNbOrders(readInteger(featuresMap.get("client_nb_orders")))
                        .clientAvgPriceHt(readDouble(featuresMap.get("client_avg_price_ht")))
                        .clientPriceStdHt(readDouble(featuresMap.get("client_price_std_ht")))
                        .clientAvgQuantity(readDouble(featuresMap.get("client_avg_quantity")))
                        .clientPriceVolatility(readDouble(featuresMap.get("client_price_volatility")))
                        .clientRelativePrice(readDouble(featuresMap.get("client_relative_price")))
                        .clientFirstOrder(readString(featuresMap.get("client_first_order"), null))
                        .clientLastOrder(readString(featuresMap.get("client_last_order"), null))
                        .clientSeniorityYears(readDouble(featuresMap.get("client_seniority_years")))
                        .clientRecencyDays(readInteger(featuresMap.get("client_recency_days")))
                        .clientPriceElasticity(readDouble(featuresMap.get("client_price_elasticity")))
                        .elasticityStatus(readString(featuresMap.get("elasticity_status"), null))
                        .build())
                .build();
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

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private String readString(Object value, String fallback) {
        return value == null ? fallback : value.toString();
    }

    private Boolean readBoolean(Object value) {
        return value instanceof Boolean bool ? bool : Boolean.FALSE;
    }

    private Double readDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private Integer readInteger(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }
}
