package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.Content;

import java.util.List;

public interface ContentRepository extends JpaRepository<Content, Long> {

    List<Content> findByBook(Book book);
}