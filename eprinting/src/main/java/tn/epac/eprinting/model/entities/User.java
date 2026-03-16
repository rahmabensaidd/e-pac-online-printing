package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.*;
import tn.epac.eprinting.model.enums.Role;

import java.time.LocalDate;


@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer userId;

    private String lastName;
    private String firstName;

    @Column(unique = true)
    private String email;

    private String password;

    private LocalDate registrationDate;

    @Enumerated(EnumType.STRING)
    private Role role;
}