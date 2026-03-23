package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Lob;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.Getter;

import lombok.Setter;

@Entity
@Getter
@Setter
public class Content {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long contentId;

    private String sourceFile;

    @Lob  // large content
    private String text;

    @ManyToOne
    private Book book;
}
