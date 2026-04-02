package tn.epac.eprinting.repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.enums.AdminBookStatus;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {


    Page<Book> findByBindingType(String bindingType, Pageable pageable);

    Page<Book> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String title, String description, Pageable pageable);

    List<Book> findByQuantityLessThan(Integer quantity);

    @Query("SELECT b FROM Book b WHERE b.quantity < :threshold AND b.stock_status != 'OUT_OF_STOCK'")
    List<Book> findBooksBelowThreshold(@Param("threshold") Integer threshold);

    @Query("SELECT COUNT(b) FROM Book b WHERE b.quantity < 10")
    long countLowStockBooks();

    @Query("SELECT AVG(b.quantity) FROM Book b")
    Double getAverageQuantity();
}