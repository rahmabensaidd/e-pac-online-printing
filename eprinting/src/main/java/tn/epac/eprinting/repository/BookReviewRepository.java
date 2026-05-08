package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.BookReview;

import java.util.List;

public interface BookReviewRepository extends JpaRepository<BookReview, Long> {

    @Query("SELECT COALESCE(AVG(br.rating), 0) FROM BookReview br WHERE br.book.bookId = :bookId")
    Double findAverageRatingByBookId(@Param("bookId") Long bookId);

    long countByBookBookId(Long bookId);

    List<BookReview> findTop2ByBookBookIdOrderByCreatedAtDesc(Long bookId);

    List<BookReview> findTop6ByFeaturedTrueOrderByCreatedAtDesc();
}
