package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.*;

/**
 * Address entity - stores user address details (city, street, zipcode, country, etc.).
 */
@Entity
@Table(name = "addresses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Adress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long adressId;
    private String city;
     private String street;
     private String zipcode;
     private String country;
     private String state;
     private String countryCode;

}
