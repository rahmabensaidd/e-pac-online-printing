package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Organization;
import tn.epac.eprinting.model.entities.OrganizationVerificationToken;

import java.util.Optional;

public interface OrganizationVerificationTokenRepository extends JpaRepository<OrganizationVerificationToken, Long> {

    Optional<OrganizationVerificationToken> findFirstByOrganizationAndTokenHashAndActiveTrueOrderByCreatedAtDesc(
            Organization organization,
            String tokenHash
    );
}
