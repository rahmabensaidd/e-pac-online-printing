package tn.epac.eprinting.model.entities;
import lombok.*;

import jakarta.persistence.*;
import tn.epac.eprinting.model.enums.AdminBookStatus;


import java.util.List;

@Entity
@Getter
@Setter
public class UserBook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer bookId;

    private String title;

    private String description;

    private String format;

    private int pageCount;

    private float salePrice;


    @Enumerated(EnumType.STRING)
    private AdminBookStatus status;

    @ManyToOne
    private User author;
}
