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
import java.time.LocalDate;
import java.util.List;

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

    private String password;

    private LocalDate registrationDate;

    @Enumerated(EnumType.STRING)
    private Role role;

    // AJOUTER la relation avec Cart
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private Cart cart;

    // Relation existante avec Orders
    @OneToMany(mappedBy = "user")
    private List<Order> orders;
}