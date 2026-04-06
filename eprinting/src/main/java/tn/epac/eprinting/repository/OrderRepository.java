package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;


public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);
    java.util.List<Order> findByUserUserIdOrderByOrderDateDesc(Long userId);
    long countByUserUserId(Long userId);

    @Query("SELECT o FROM Order o WHERE " +
            "LOWER(o.reference) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(o.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(o.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(o.user.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Order> searchOrders(@Param("search") String search, Pageable pageable);

    long countByStatus(OrderStatus status);

    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.status NOT IN :excludedStatuses")
    BigDecimal sumTotalAmountByExcludedStatuses(@Param("excludedStatuses") OrderStatus... excludedStatuses);
}
