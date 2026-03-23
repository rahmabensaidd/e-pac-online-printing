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

    private String format;

    private int pageCount;

    private float salePrice;


    private boolean is_created_by_user;
    @Enumerated(EnumType.STRING)
    private UserBookStatus userbook_status;
    @ManyToOne User creation_author;

    private boolean is_added_from_admin;
    @Enumerated(EnumType.STRING)
    private AdminBookStatus stock_status;
    private String[] authors;

}
