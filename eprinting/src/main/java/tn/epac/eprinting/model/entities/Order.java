package tn.epac.eprinting.model.entities;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.CascadeType;
import jakarta.persistence.FetchType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;


import tn.epac.eprinting.model.enums.OrderStatus;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
/**
 * Order entity - represents a customer purchase order.
 * Contains order status, total amount, and linked billing, shipping, and order lines.
 */
@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderId;

    private LocalDate orderDate;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private float totalAmount;

    @ManyToOne
    private User user;

    @OneToOne(cascade = CascadeType.ALL)
    private Billing billing;

    @OneToOne(cascade = CascadeType.ALL)
    private Shipping shipping;

    // Ajouter la relation OneToMany avec OrderLine
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderLine> orderLines = new ArrayList<>();
}