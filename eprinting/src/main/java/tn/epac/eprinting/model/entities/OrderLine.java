package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.*;
import tn.epac.eprinting.model.enums.CartItemSource;
import tn.epac.eprinting.model.enums.OrderLineStatus;
import tn.epac.eprinting.model.enums.OrderPriority;
import tn.epac.eprinting.model.enums.OrderValidationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_lines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class OrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderLineId;

    @ManyToOne
    @JoinColumn(name = "book_id")
    private Book book;

    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_source", nullable = false, length = 20)
    @Builder.Default
    private CartItemSource itemSource = CartItemSource.MARKETPLACE;

    @Column(name = "is_estimated", nullable = false)
    @Builder.Default
    private Boolean isEstimated = Boolean.FALSE;

    @Column(name = "currency", nullable = false, length = 8)
    @Builder.Default
    private String currency = "USD";

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    // Changement : EnumType.STRING au lieu de converter
    @Enumerated(EnumType.STRING)
    @Column(name = "line_status", length = 24)
    @Builder.Default
    private OrderLineStatus lineStatus = OrderLineStatus.READY;

    // Priorité stockée directement en String
    @Enumerated(EnumType.STRING)
    @Column(name = "line_priority", length = 16)
    @Builder.Default
    private OrderPriority priority = OrderPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", length = 16)
    @Builder.Default
    private OrderValidationStatus validationStatus = OrderValidationStatus.PENDING;

    public float getBookPrice() {
        return book != null ? book.getSalePrice() : 0;
    }

    public void calculateTotalPrice() {
        if (quantity != null && unitPrice != null) {
            this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
    }

    public boolean isCustomItem() {
        return itemSource == CartItemSource.CUSTOM;
    }

    public boolean isMarketplaceItem() {
        return itemSource == null || itemSource == CartItemSource.MARKETPLACE;
    }
}