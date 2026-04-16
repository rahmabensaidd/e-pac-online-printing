package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.Role;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    Optional<User> findByUsernameIgnoreCase(String username);

    List<User> findByRole(Role role);
    List<User> findAllByOrderByUserIdDesc();

    boolean existsByEmail(String email);
    boolean existsByUsernameIgnoreCase(String username);
}
