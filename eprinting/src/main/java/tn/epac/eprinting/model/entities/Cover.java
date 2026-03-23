package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.OneToOne;
import lombok.Getter;
import lombok.Setter;


@Entity
@Getter
@Setter
/**
 * *
 */
public class Cover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long coverId;

    private String image;

    private String title;

    private String barcode;

    @OneToOne
    private Book book;
}