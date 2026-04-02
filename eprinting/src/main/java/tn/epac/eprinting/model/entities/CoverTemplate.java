package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.TemplateType;

/**
 * CoverTemplate entity
 * Stores front model and text areas configuration.
 */
@Entity
@Getter
@Setter
public class CoverTemplate  {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long templateId;

    private String name;

    @Enumerated(EnumType.STRING)
    private TemplateType type;

    private String templateFile;
    private String frontModel;

    private String textAreas;
}