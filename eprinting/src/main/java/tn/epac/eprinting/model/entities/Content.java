package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Lob;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.Getter;
import lombok.Setter;
/**
 * This entity stores the content associated with a book, which can be:
 * - Linked to a source file (e.g., PDF, DOCX) for original document reference
 * - Stored as large text content using @Lob for extractable text
 *
 ** Relationships:
 * - Many-to-one relationship with Book (multiple content entries can belong to one book,
 *   though typically one book has one content record)
 */
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
