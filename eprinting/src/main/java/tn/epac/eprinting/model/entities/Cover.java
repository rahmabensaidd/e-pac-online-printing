package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
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