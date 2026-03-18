package tn.epac.eprinting.model.entities;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import jakarta.persistence.*;
import tn.epac.eprinting.model.enums.OrderStatus;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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