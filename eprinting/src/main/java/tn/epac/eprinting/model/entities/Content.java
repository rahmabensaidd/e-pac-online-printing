package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;

import lombok.*;

@Entity
@Getter
@Setter
public class Content {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long contentId;

    private String sourceFile;

    @Lob
    private String text;

    @ManyToOne
    private Book book;
}
