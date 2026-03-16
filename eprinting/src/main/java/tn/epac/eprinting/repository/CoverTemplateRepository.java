package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.CoverTemplate;

public interface CoverTemplateRepository extends JpaRepository<CoverTemplate, Long> {
}