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

    // identifiant barcode
    private String barcodeId;

    // plusieurs images associées au cover
    @ElementCollection
    @CollectionTable(name = "cover_images", joinColumns = @JoinColumn(name = "cover_id"))
    @Column(name = "image_path")
    private List<String> images;

    // plusieurs textes présents sur le cover
    @ElementCollection
    @CollectionTable(name = "cover_texts", joinColumns = @JoinColumn(name = "cover_id"))
    @Column(name = "text_value", columnDefinition = "TEXT")
    private List<String> texts;

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
        boolean hasBarcode = barcodeId != null && !barcodeId.trim().isEmpty();
        boolean hasImages = images != null && !images.isEmpty();
        boolean hasTexts = texts != null && !texts.isEmpty();

        // 🔴 Si PDF existe → bloquer les autres champs (sauf title)
        if (hasPdf && (hasBarcode || hasImages || hasTexts)) {
            throw new IllegalStateException(
                    "If PDF is provided, barcodeId, images, and texts must be empty"
            );
        }

        // 🔴 Si pas de PDF → au moins un contenu doit exister (hors title)
        if (!hasPdf && !hasBarcode && !hasImages && !hasTexts) {
            throw new IllegalStateException(
                    "Cover must contain at least one of: barcodeId, images, texts, or a PDF"
            );
        }

        // 🔴 Vérification type PDF
        if (hasPdf && pdfFileType != null && !pdfFileType.equalsIgnoreCase("application/pdf")) {
            throw new IllegalStateException("Cover file must be a PDF");
        }
    }
}