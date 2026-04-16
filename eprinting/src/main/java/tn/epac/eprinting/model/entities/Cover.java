package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
@Table(name = "covers")
public class Cover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long coverId;

    // toujours autorisé
    private String title;
    // PDF prêt du cover
    private String pdfFileName;

    private String pdfFileType;

    private String pdfFilePath;

    @OneToOne
    @JoinColumn(name = "book_id", unique = true, nullable = false)
    private Book book;



    @ManyToOne
    @JoinColumn(name = "template_id")
    private CoverTemplate coverTemplate;

    @PrePersist
    @PreUpdate
    public void validateCover() {

        boolean hasPdf = pdfFilePath != null && !pdfFilePath.trim().isEmpty();




        // 🔴 Vérification type PDF
        if (hasPdf && pdfFileType != null && !pdfFileType.equalsIgnoreCase("application/pdf")) {
            throw new IllegalStateException("Cover file must be a PDF");
        }
    }
}