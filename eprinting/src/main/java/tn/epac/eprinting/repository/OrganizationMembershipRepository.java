package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Organization;
import tn.epac.eprinting.model.entities.OrganizationMembership;
import tn.epac.eprinting.model.enums.MembershipStatus;
import tn.epac.eprinting.model.enums.OrganizationRole;

public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, Long> {

    boolean existsByOrganizationAndRoleAndStatus(
            Organization organization,
            OrganizationRole role,
            MembershipStatus status
    );
}
