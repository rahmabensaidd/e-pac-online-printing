package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;
import tn.epac.eprinting.model.enums.AdminBookStatus;
import tn.epac.eprinting.model.enums.UserBookStatus;

/**
 * Book entity representing a printable document in the e-printing system.
 *
 * A book can be either:
 * - Added by an admin (pre-defined books available in the store)
 * - Created by a user (custom documents uploaded by users for printing)
 *
 * The entity tracks both creation source and status through dedicated fields:
 * - is_created_by_user / userbook_status for user-created books
 * - is_added_from_admin / stock_status for admin-added books
 */

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
    @ManyToOne User creation_author;


    private boolean is_added_from_admin;
    @Enumerated(EnumType.STRING)
    private AdminBookStatus stock_status;
    private String[] authors;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "pageCount")
    private Integer pageCount;

    @Column(nullable = false)
    private Integer height;

    @Column(nullable = false)
    private Integer thickness;

    @Column(nullable = false)
    private Integer width;

    // Boolean fields treated as numeric (0/1)
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

    // ============ CATEGORICAL FIELDS (CAT_COLS) ============

    @Column(name = "text_paper_type", nullable = false)
    private String textPaperType;

    @Column(name = "text_color", nullable = false)
    private String textColor;

    @Column(name = "cover_finish_type", nullable = false)
    private String coverFinishType;

    @Column(name = "cover_color", nullable = false)
    private String coverColor;

    @Column(name = "cover_size", nullable = false)
    private String coverSize;

    @Column(name = "cover_paper_type", nullable = false)
    private String coverPaperType;

    @Column(name = "head_and_tail", nullable = false)
    private String headAndTail;

    @Column(name = "priority_level", nullable = false)
    private String priorityLevel;

    @Column(name = "binding_type", nullable = false)
    private String bindingType;

    @Column(name = "coil_type")
    private String coilType;

    @Column(name = "tab_color")
    private String tabColor;

    @Column(name = "insert_paper_type")
    private String insertPaperType;

    @Column(name = "case_finish_type")
    private String caseFinishType;

    @Column(name = "spine_type")
    private String spineType;

    @Column(name = "label_type")
    private String labelType;

    @Column(nullable = false)
    private String siren;

    private float salePrice;

    /**
     * Validate required fields before persistence
     */
    @PrePersist
    @PreUpdate
    public void validate() {

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
