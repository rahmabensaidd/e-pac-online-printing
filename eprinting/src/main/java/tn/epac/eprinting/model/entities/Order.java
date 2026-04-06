package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;


import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.OrderPriority;
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

    @Column(name = "reference", unique = true)
    private String reference;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    private OrderPriority priority;

    private float totalAmount;

    @ManyToOne
    private User user;

    @OneToOne(cascade = CascadeType.ALL)
    private Billing billing;

    @OneToOne(cascade = CascadeType.ALL)
    private Shipping shipping;

    // Relation unidirectionnelle Order -> OrderLine
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "order_id")
    private List<OrderLine> orderLines = new ArrayList<>();
}
