package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.CoverTemplate;

import java.util.List;

public interface CoverTemplateRepository extends JpaRepository<CoverTemplate, Long> {
    List<CoverTemplate> findByCreationAuthor_UserIdAndStatusAndActiveTrueOrderByUpdatedAtDesc(Long userId, String status);

    List<CoverTemplate> findByStatusAndActiveTrueOrderByUpdatedAtDesc(String status);

    List<CoverTemplate> findByCreationAuthor_UserIdAndActiveTrueOrderByUpdatedAtDesc(Long userId);

    List<CoverTemplate> findByStatusAndCreatedByAdminTrueAndActiveTrueOrderByUpdatedAtDesc(String status);
}
