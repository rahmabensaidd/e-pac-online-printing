package tn.epac.eprinting.model.entities;


import lombok.*;

import jakarta.persistence.*;
import tn.epac.eprinting.model.enums.TemplateType;

@Entity
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
public abstract class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long templateId;

    private String name;

    @Enumerated(EnumType.STRING)
    private TemplateType type;

    private String templateFile;
}