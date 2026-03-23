package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.UserBookStatus;

@Entity
@Getter
@Setter
public class UserBook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userbookId;

    private String title;

    private String description;

    private String format;

    private int pageCount;

    private float salePrice;


    @Enumerated(EnumType.STRING)
    private UserBookStatus status;

    @ManyToOne
    private User author;
}
