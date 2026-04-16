package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.TemplateType;

/**
        * TextTemplate entity -
 * Stores font and margin configurations.
 */

@Entity
@Getter
@Setter
public class TextTemplate  {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long templateId;

    private String name;

    @Enumerated(EnumType.STRING)
    private TemplateType type;

    private String templateFile;
    private String fonts;

    private String margins;

    @Column(name = "is_created_by_admin")
    private Boolean createdByAdmin = Boolean.FALSE;

    @ManyToOne
    @JoinColumn(name = "creation_author_id")
    private User creationAuthor;
}
