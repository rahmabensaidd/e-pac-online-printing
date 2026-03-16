package tn.epac.eprinting.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.BookStatus;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Integer> {

    List<Book> findByAuthor(User author);

    List<Book> findByStatus(BookStatus status);

    List<Book> findByTitleContainingIgnoreCase(String title);
}