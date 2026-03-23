package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

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
    @JoinColumn(name = "cart_id")
    private Cart cart;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne
    @JoinColumn(name = "book_id")
    private Book book;



    private Integer quantity;

    private BigDecimal unitPrice;

    private BigDecimal totalPrice;



    // Méthode pour obtenir le prix du livre
    public float getBookPrice() {
        if (book != null) return book.getSalePrice();

        return 0;
    }

    // Méthode pour recalculer le total
    public void calculateTotalPrice() {
        if (quantity != null && unitPrice != null) {
            this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
    }


}