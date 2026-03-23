package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.ShippingStatus;
import java.time.LocalDate;

@Entity
@Getter
@Setter
public class Shipping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long shippingId;

    private String shippingAddress;

    private String shippingMethod;

    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    private ShippingStatus shippingStatus;

    private LocalDate estimatedDelivery;

    private float shippingCost;
}