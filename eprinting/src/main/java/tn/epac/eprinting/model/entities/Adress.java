package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;
/**
 * Address entity - stores user address details (city, street, zipcode, country, etc.).
 */
@Entity
@Getter
@Setter
public class Adress {
    private Long id;
    private String city;
     private String street;
     private String zipcode;
     private String country;
     private String state;
     private String countryCode;

}
