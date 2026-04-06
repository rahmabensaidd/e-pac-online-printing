package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
/**
 * Cart entity representing a shopping cart in the e-printing system.
 *
 * A cart is associated with a user and contains a collection of order lines (items).
 * It handles the temporary storage of books/services before order confirmation.
 *
 * - each user has one active cart
 * - One-to-one relationship with Order (converted to order upon checkout)
 */

@Entity
@Table(name = "carts")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Setter
@Getter
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long cartId;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    @OneToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "cart_id")
    @Builder.Default
    private List<OrderLine> items = new ArrayList<>();

    private BigDecimal totalPrice;


    public void addItem(OrderLine item) {
        items.add(item);
        calculateTotal();
    }

    public void removeItem(OrderLine item) {
        items.remove(item);
        calculateTotal();
    }


    public void calculateTotal() {
        if (items == null || items.isEmpty()) {
            this.totalPrice = BigDecimal.ZERO;
            return;
        }

        this.totalPrice = items.stream()
                .map(OrderLine::getTotalPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getCalculatedTotal() {
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return items.stream()
                .map(OrderLine::getTotalPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }


    public void clearCart() {
        items.clear();
        calculateTotal();
    }


    public boolean isEmpty() {
        return items == null || items.isEmpty();
    }

    public int getItemCount() {
        return items != null ? items.size() : 0;
    }
}
