package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "contents")
public class Content {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long contentId;

    // nom original du fichier
    @Column(nullable = false)
    private String fileName;

    // type MIME : application/pdf
    @Column(nullable = false)
    private String fileType;

    // emplacement du fichier sur serveur
    @Column(nullable = false)
    private String filePath;

    @OneToOne
    @JoinColumn(name = "book_id", unique = true, nullable = false)
    private Book book;

    @ManyToOne
    @JoinColumn(name = "text_template_id")
    private TextTemplate textTemplate;

    @PrePersist
    @PreUpdate
    public void validateContent() {
        boolean hasPdf = filePath != null && !filePath.trim().isEmpty();

        if (!hasPdf) {
            throw new IllegalStateException("Content must contain a PDF file");
        }

        if (fileType == null || !fileType.equalsIgnoreCase("application/pdf")) {
            throw new IllegalStateException("Only PDF files are allowed");
        }
    }
}