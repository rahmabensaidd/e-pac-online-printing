package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "cover_templates")
public class CoverTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long templateId;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    /**
     * WRAP_1P, WRAP_2P, FLAT_2P, FLAT_4P
     */
    @Column(nullable = false)
    private String family;

    /**
     * Ex: WRAP_1P_BLANK, WRAP_2P_BLANK...
     */
    @Column(nullable = false)
    private String sourceBlankCode;

    /**
     * DRAFT, PUBLISHED, ARCHIVED
     */
    @Column(nullable = false)
    private String status;

    /**
     * Scène CE.SDK sauvegardée avec saveToString()
     */
    @Lob
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String sceneString;

    /**
     * URL ou chemin miniature
     */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String thumbnailUrl;

    /**
     * Optionnel: JSON métier (roles placeholders, infos extra)
     */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String metadataJson;

    @Column(name = "is_created_by_admin", nullable = false)
    private Boolean createdByAdmin = Boolean.FALSE;

    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;

    private Integer version = 1;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creation_author_id")
    private User creationAuthor;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null || status.isBlank()) {
            status = "DRAFT";
        }
        if (family == null || family.isBlank()) {
            family = "CUSTOM";
        }
        if (sourceBlankCode == null || sourceBlankCode.isBlank()) {
            sourceBlankCode = "CUSTOM";
        }
        if (version == null) {
            version = 1;
        }
        if (active == null) {
            active = true;
        }
        if (createdByAdmin == null) {
            createdByAdmin = false;
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
