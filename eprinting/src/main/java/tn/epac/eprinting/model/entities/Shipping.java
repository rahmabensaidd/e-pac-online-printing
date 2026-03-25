package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.ShippingStatus;
import java.time.LocalDate;
/**
 * Shipping entity - manages delivery information for orders.
 * Contains shipping address, method, tracking, and status.
 */
@Entity
@Getter
@Setter
public class Shipping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long shippingId;
    @ManyToOne
    private Adress shippingAddress;

    private String shippingMethod;

    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    private ShippingStatus shippingStatus;

    private LocalDate estimatedDelivery;

    private float shippingCost;
}