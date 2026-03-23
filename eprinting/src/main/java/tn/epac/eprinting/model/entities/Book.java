package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;
import tn.epac.eprinting.model.enums.AdminBookStatus;
import tn.epac.eprinting.model.enums.UserBookStatus;

@Table(name = "admin_books")
@NoArgsConstructor  // ⚠️ REQUIS par JPA
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

    private String[] authors;

    @ManyToOne User creation_author;

    @Enumerated(EnumType.STRING)
    private UserBookStatus userbook_status;

    @Enumerated(EnumType.STRING)
    private AdminBookStatus stock_status;
}
