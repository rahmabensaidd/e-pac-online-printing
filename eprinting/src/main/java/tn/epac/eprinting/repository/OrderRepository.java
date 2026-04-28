package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.ShippingMethod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;


public interface OrderRepository extends JpaRepository<Order, Long> {
    java.util.Optional<Order> findByReference(String reference);
    java.util.Optional<Order> findFirstByShippingCarrierShipmentId(String carrierShipmentId);
    java.util.Optional<Order> findFirstByShippingTrackingNumber(String trackingNumber);
    java.util.Optional<Order> findTopByUserUserIdOrderByOrderDateDesc(Long userId);
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);
    java.util.List<Order> findByUserUserIdOrderByOrderDateDesc(Long userId);
    long countByUserUserId(Long userId);
    boolean existsByOrderLinesBookBookId(Long bookId);

    @Query("SELECT o FROM Order o WHERE " +
            "LOWER(o.reference) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(o.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(o.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(o.user.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Order> searchOrders(@Param("search") String search, Pageable pageable);

    long countByStatus(OrderStatus status);
    long countByShippingShippingMethod(ShippingMethod shippingMethod);

    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.status NOT IN :excludedStatuses")
    BigDecimal sumTotalAmountByExcludedStatuses(@Param("excludedStatuses") OrderStatus... excludedStatuses);

    @Query("""
            SELECT DISTINCT o
            FROM Order o
            LEFT JOIN FETCH o.orderLines ol
            LEFT JOIN FETCH ol.book
            LEFT JOIN FETCH o.user
            LEFT JOIN FETCH o.billing
            LEFT JOIN FETCH o.shipping
            WHERE o.orderId = :orderId
            """)
    java.util.Optional<Order> findByIdWithLines(@Param("orderId") Long orderId);
}
