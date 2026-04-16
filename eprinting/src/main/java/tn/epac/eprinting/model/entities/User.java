package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.EnumType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.model.enums.UserType;
import java.time.LocalDate;
import java.util.List;
/**
 * User entity - represents a system user (customer or admin).
 * Manages authentication, profile info, and links to cart and orders.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    private String lastName;
    private String firstName;

    @Column(unique = true)
    private String email;

    @Column(unique = true)
    private String username;

    private String password;

    private Long phoneNumber;

    private String companyName;

    @Column(name = "is_enabled")
    private Boolean enabled = Boolean.TRUE;

    private LocalDate registrationDate;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", length = 24)
    private UserType userType = UserType.SIMPLE;

    // AJOUTER la relation avec Cart
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private Cart cart;

    // Relation existante avec Orders
    @OneToMany(mappedBy = "user")
    private List<Order> orders;

    @OneToMany(mappedBy = "creationAuthor")
    private List<CoverTemplate> coverTemplates;

}
