package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.TextTemplate;

public interface TextTemplateRepository extends JpaRepository<TextTemplate, Long> {
}