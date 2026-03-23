package tn.epac.eprinting.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.AdminBook;

import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.UserBookStatus;

import java.util.List;

public interface AdminBookRepository extends JpaRepository<AdminBook, Integer> {

    List<AdminBook> findByAuthor(User author);

    List<AdminBook> findByStatus(UserBookStatus status);

    List<AdminBook> findByTitleContainingIgnoreCase(String title);
}