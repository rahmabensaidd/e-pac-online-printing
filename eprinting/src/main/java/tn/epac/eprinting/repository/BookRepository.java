package tn.epac.eprinting.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.enums.AdminBookStatus;
import tn.epac.eprinting.model.enums.BindingType;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {

    boolean existsByTitleIgnoreCase(String title);

    // Recherche par titre ou description (utilisée dans getAllBooks)
    Page<Book> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String title, String description, Pageable pageable);

    // Recherche par quantité inférieure (utilisée dans getLowStockBooks)
    List<Book> findByQuantityLessThan(Integer quantity);

    // Recherche avancée (utilisée dans searchBooks)
    @Query("SELECT b FROM Book b WHERE " +
            "(:title IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :title, '%'))) AND " +
            "(:author IS NULL OR EXISTS (SELECT 1 FROM b.authors a WHERE LOWER(a) LIKE LOWER(CONCAT('%', :author, '%')))) AND " +
            "(:minPrice IS NULL OR b.salePrice >= :minPrice) AND " +
            "(:maxPrice IS NULL OR b.salePrice <= :maxPrice) AND " +
            "(:bindingType IS NULL OR b.bindingType = :bindingType)")
    Page<Book> searchBooks(@Param("title") String title,
                           @Param("author") String author,
                           @Param("minPrice") Float minPrice,
                           @Param("maxPrice") Float maxPrice,
                           @Param("bindingType") BindingType bindingType,
                           Pageable pageable);

    // Recherche par statut (utilisée dans getBooksByStatus)
    @Query("SELECT b FROM Book b WHERE b.stock_status = :status")
    Page<Book> findByStockStatus(@Param("status") AdminBookStatus status, Pageable pageable);

    // Recherche par type de reliure (utilisée dans getBooksByBindingType)
    @Query("SELECT b FROM Book b WHERE b.bindingType = :bindingType")
    List<Book> findByBindingType(@Param("bindingType") BindingType bindingType);

    // Version avec pagination pour getBooksByBindingType si nécessaire
    @Query("SELECT b FROM Book b WHERE b.bindingType = :bindingType")
    Page<Book> findByBindingType(@Param("bindingType") BindingType bindingType, Pageable pageable);

    // Compte des livres en stock faible (utilisée optionnellement)
    @Query("SELECT COUNT(b) FROM Book b WHERE b.quantity < 10")
    long countLowStockBooks();

    // Moyenne des quantités (utilisée optionnellement)
    @Query("SELECT AVG(b.quantity) FROM Book b")
    Double getAverageQuantity();

    // Recherche avec tous les filtres (alternative plus complète)
    @Query("SELECT b FROM Book b WHERE " +
            "(:search IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(b.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR b.stock_status = :status) AND " +
            "(:bindingType IS NULL OR b.bindingType = :bindingType)")
    Page<Book> findAllWithFilters(@Param("search") String search,
                                  @Param("status") AdminBookStatus status,
                                  @Param("bindingType") BindingType bindingType,
                                  Pageable pageable);

    @Query("SELECT b FROM Book b WHERE b.is_added_from_admin = true AND (" +
            ":search IS NULL OR TRIM(:search) = '' OR " +
            "LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Book> findMarketplaceBooks(@Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(b) FROM Book b WHERE b.is_added_from_admin = true")
    long countMarketplaceBooks();
}
