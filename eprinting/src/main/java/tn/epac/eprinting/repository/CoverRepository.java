package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.Cover;

import java.util.Optional;

public interface CoverRepository extends JpaRepository<Cover, Long> {

    Optional<Cover> findByBook(Book book);
}