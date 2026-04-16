package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.OrganizationRegistrationRequestDto;
import tn.epac.eprinting.model.dtos.OrganizationRegistrationResponseDto;
import tn.epac.eprinting.model.entities.Organization;
import tn.epac.eprinting.model.entities.OrganizationMembership;
import tn.epac.eprinting.model.entities.OrganizationVerificationToken;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.MembershipStatus;
import tn.epac.eprinting.model.enums.OrganizationRole;
import tn.epac.eprinting.model.enums.OrganizationStatus;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.model.enums.UserType;
import tn.epac.eprinting.repository.OrganizationMembershipRepository;
import tn.epac.eprinting.repository.OrganizationRepository;
import tn.epac.eprinting.repository.OrganizationVerificationTokenRepository;
import tn.epac.eprinting.repository.UserRepository;
import tn.epac.eprinting.util.OrganizationNormalizationUtils;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class OrganizationRegistrationServiceImpl {

    private final OrganizationRepository organizationRepository;
    private final OrganizationVerificationTokenRepository tokenRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrganizationVerificationTokenService tokenService;

    public OrganizationRegistrationResponseDto registerOrganizationAccount(OrganizationRegistrationRequestDto request) {
        String normalizedSiren = OrganizationNormalizationUtils.normalizeSiren(request.getSiren());
        if (normalizedSiren.length() != 9) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid SIREN format");
        }

        Organization organization = organizationRepository.findByNormalizedSiren(normalizedSiren)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization not found"));

        if (organization.getStatus() == OrganizationStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Organization is inactive");
        }

        String normalizedOrgName = OrganizationNormalizationUtils.normalizeOrganizationName(request.getOrganizationName());
        if (!normalizedOrgName.equals(organization.getNormalizedName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization information does not match");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        if (membershipRepository.existsByOrganizationAndRoleAndStatus(
                organization,
                OrganizationRole.OWNER,
                MembershipStatus.ACTIVE
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Organization has already been claimed");
        }

        String tokenHash = tokenService.hashToken(request.getVerificationToken().trim());
        OrganizationVerificationToken verificationToken = tokenRepository
                .findFirstByOrganizationAndTokenHashAndActiveTrueOrderByCreatedAtDesc(organization, tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification token"));

        if (verificationToken.getUsedAt() != null || Boolean.FALSE.equals(verificationToken.getActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification token");
        }
        if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification token");
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(resolveUniqueUsername(email));
        user.setFirstName(organization.getName());
        user.setLastName("Account");
        user.setCompanyName(organization.getName());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);
        user.setUserType(UserType.ORGANIZATION);
        user.setEnabled(Boolean.TRUE);
        user.setRegistrationDate(LocalDate.now());
        User savedUser = userRepository.save(user);

        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setUser(savedUser);
        membership.setRole(OrganizationRole.OWNER);
        membership.setStatus(MembershipStatus.ACTIVE);
        membershipRepository.save(membership);

        verificationToken.setUsedAt(LocalDateTime.now());
        verificationToken.setActive(Boolean.FALSE);
        tokenRepository.save(verificationToken);

        return OrganizationRegistrationResponseDto.builder()
                .userId(savedUser.getUserId())
                .organizationId(organization.getId())
                .message("Organization account created successfully")
                .build();
    }

    private String resolveUniqueUsername(String email) {
        String base = email.trim().toLowerCase();
        if (!userRepository.existsByUsernameIgnoreCase(base)) {
            return base;
        }

        String localPart = base.split("@")[0];
        String fallback = localPart + "_" + System.currentTimeMillis();
        if (!userRepository.existsByUsernameIgnoreCase(fallback)) {
            return fallback;
        }
        return "org_" + System.nanoTime();
    }
}
