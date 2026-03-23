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

    // AJOUTER cette relation avec User
    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    @OneToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderLine> items = new ArrayList<>();

    private BigDecimal totalPrice;  // Changé de Float à BigDecimal pour cohérence

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

    /**
     * Calcule le prix total du panier en sommant le totalPrice de chaque OrderLine
     */
    public void calculateTotal() {
        if (items == null || items.isEmpty()) {
            this.totalPrice = BigDecimal.ZERO;
            return;
        }

        this.totalPrice = items.stream()
                .map(OrderLine::getTotalPrice)  // Récupère le totalPrice de chaque ligne
                .filter(price -> price != null)  // Ignore les nulls
                .reduce(BigDecimal.ZERO, BigDecimal::add);  // Somme tous les prix
    }

    /**
     * Calcule le total et le retourne sans modifier l'objet
     */
    public BigDecimal getCalculatedTotal() {
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return items.stream()
                .map(OrderLine::getTotalPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Vide complètement le panier
     */
    public void clearCart() {
        items.clear();
        calculateTotal();
    }

    /**
     * Vérifie si le panier est vide
     */
    public boolean isEmpty() {
        return items == null || items.isEmpty();
    }

    /**
     * Retourne le nombre d'articles dans le panier
     */
    public int getItemCount() {
        return items != null ? items.size() : 0;
    }
}