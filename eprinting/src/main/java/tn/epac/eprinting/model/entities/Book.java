package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;
import tn.epac.eprinting.model.enums.*;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;

@Table(name = "admin_books")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long bookId;

    private String title;
    private String description;

    private boolean is_created_by_user;

    @Enumerated(EnumType.STRING)
    private UserBookStatus userbook_status;

    @ManyToOne
    private User creation_author;

    private boolean is_added_from_admin;

    @Enumerated(EnumType.STRING)
    private AdminBookStatus stock_status;

    @ElementCollection
    @CollectionTable(name = "book_authors", joinColumns = @JoinColumn(name = "book_id"))
    @Column(name = "author")
    private List<String> authors;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "production_page", nullable = false)
    private Integer productionPage;

    @Column(nullable = false)
    private Integer height;

    @Column(nullable = false)
    private Integer thickness;

    @Column(nullable = false)
    private Integer width;

    @Column(name = "security_label", nullable = false)
    private Boolean securityLabel;

    @Column(name = "has_coil", nullable = false)
    private Boolean hasCoil;

    @Column(name = "has_insert", nullable = false)
    private Boolean hasInsert;

    @Column(name = "has_tab", nullable = false)
    private Boolean hasTab;

    @Column(name = "has_backcover", nullable = false)
    private Boolean hasBackcover;

    @Column(nullable = false)
    private Boolean perf;

    @Column(name = "double_sided_cover", nullable = false)
    private Boolean doubleSidedCover;

    @Column(nullable = false)
    private Boolean shrinkwrap;

    @Column(name = "three_hole_drill", nullable = false)
    private Boolean threeHoleDrill;

    @Column(name = "pnl_cover", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean pnlCover = Boolean.FALSE;

    @Column(name = "pnl_text", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean pnlText = Boolean.FALSE;

    @Enumerated(EnumType.STRING)
    @Column(name = "text_paper_type", nullable = false)
    private TextPaperType textPaperType;

    @Enumerated(EnumType.STRING)
    @Column(name = "text_color", nullable = false)
    private TextColor textColor;

    @Enumerated(EnumType.STRING)
    @Column(name = "cover_finish_type", nullable = false)
    private CoverFinishType coverFinishType;

    @Enumerated(EnumType.STRING)
    @Column(name = "cover_color", nullable = false)
    private CoverColor coverColor;

    @Enumerated(EnumType.STRING)
    @Column(name = "cover_size", nullable = false)
    private CoverSize coverSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "cover_paper_type", nullable = false)
    private CoverPaperType coverPaperType;

    @Enumerated(EnumType.STRING)
    @Column(name = "head_and_tail", nullable = false)
    private HeadAndTail headAndTail;



    @Enumerated(EnumType.STRING)
    @Column(name = "binding_type", nullable = false)
    private BindingType bindingType;

    @Enumerated(EnumType.STRING)
    @Column(name = "coil_type")
    private CoilType coilType;

    @Enumerated(EnumType.STRING)
    @Column(name = "tab_color")
    private TabColor tabColor;

    @Enumerated(EnumType.STRING)
    @Column(name = "insert_paper_type")
    private InsertPaperType insertPaperType;

    @Enumerated(EnumType.STRING)
    @Column(name = "case_finish_type")
    private CaseFinishType caseFinishType;

    @Enumerated(EnumType.STRING)
    @Column(name = "spine_type")
    private SpineType spineType;

    @Enumerated(EnumType.STRING)
    @Column(name = "label_type")
    private LabelType labelType;

    private float salePrice;

    @Column(name = "siren", nullable = true)
    private String siren;

    @Column(name = "creation_date", nullable = false, updatable = false)
    private LocalDateTime creationDate;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = true)
    private Cover cover;

    @OneToOne(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = true)
    private Content content;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "book_id")
    @Builder.Default
    private List<PnlInformation> pnlInformations = new ArrayList<>();

    @PrePersist
    @PreUpdate
    public void validateAndInitialize() {
        LocalDateTime now = LocalDateTime.now();
        if (creationDate == null) {
            creationDate = now;
        }
        updatedAt = now;

        if (productionPage == null || productionPage <= 0) {
            throw new IllegalStateException("Production page must be positive");
        }
        if (height == null || height <= 0) {
            throw new IllegalStateException("Height must be positive");
        }
        if (width == null || width <= 0) {
            throw new IllegalStateException("Width must be positive");
        }
        if (thickness == null || thickness <= 0) {
            throw new IllegalStateException("Thickness must be positive");
        }
    }


}
