package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Organization;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findByNormalizedSiren(String normalizedSiren);

    boolean existsByNormalizedSiren(String normalizedSiren);

    java.util.List<Organization> findAllByOrderByCreatedAtDesc();
}
