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

    @Lob
    @Column(name = "text_content")
    private String textContent;

    // nom original du fichier
    private String fileName;

    // type MIME : application/pdf
    private String fileType;

    // emplacement du fichier sur serveur
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
        boolean hasText = textContent != null && !textContent.trim().isEmpty();
        boolean hasPdf = filePath != null && !filePath.trim().isEmpty();

        if (!hasText && !hasPdf) {
            throw new IllegalStateException("Content must contain either text or a PDF file");
        }

        if (hasPdf && fileType != null && !fileType.equalsIgnoreCase("application/pdf")) {
            throw new IllegalStateException("Only PDF files are allowed");
        }
    }
}
