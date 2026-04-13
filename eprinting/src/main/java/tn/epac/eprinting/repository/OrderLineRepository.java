package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.model.enums.CartItemSource;

import java.util.Optional;

public interface OrderLineRepository extends JpaRepository<OrderLine, Long> {

    @Query("""
            select ol
            from Cart c
            join c.items ol
            where c.cartId = :cartId and ol.orderLineId = :orderLineId
            """)
    Optional<OrderLine> findByOrderLineIdAndCartCartId(
            @Param("orderLineId") Long orderLineId,
            @Param("cartId") Long cartId
    );

    @Query("""
            select ol
            from Cart c
            join c.items ol
            where c.cartId = :cartId and ol.book.bookId = :bookId
            """)
    Optional<OrderLine> findByCartCartIdAndBookBookId(
            @Param("cartId") Long cartId,
            @Param("bookId") Long bookId
    );

    @Query("""
            select ol
            from Cart c
            join c.items ol
            where c.cartId = :cartId and ol.book.bookId = :bookId and ol.itemSource = :itemSource
            """)
    Optional<OrderLine> findByCartCartIdAndBookBookIdAndItemSource(
            @Param("cartId") Long cartId,
            @Param("bookId") Long bookId,
            @Param("itemSource") CartItemSource itemSource
    );

}
