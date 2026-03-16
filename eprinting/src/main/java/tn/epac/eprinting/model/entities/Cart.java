package tn.epac.eprinting.model.entities;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "carts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long cartId;

    @OneToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL)
    @Builder.Default
    private List<OrderLine> items = new ArrayList<>();

    private Float totalPrice;

    // Méthodes utilitaires
    public void addItem(OrderLine item) {
        items.add(item);
        item.setCart(this);
        calculateTotal();
    }

    public void removeItem(OrderLine item) {
        items.remove(item);
        item.setCart(null);
        calculateTotal();
    }

    private void calculateTotal() {
        this.totalPrice = (float) items.stream()
                .mapToDouble(item -> item.getBook().getSalePrice() * item.getQuantity())
                .sum();
    }
}