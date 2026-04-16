package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.ShippingMethod;
import tn.epac.eprinting.model.enums.ShippingStatus;

import java.time.LocalDate;

/**
 * Shipping entity - manages delivery information for orders.
 * Contains shipping address, method, tracking, and status.
 */
@Entity
@Table(name = "shipping")
@Getter
@Setter
public class Shipping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long shippingId;

    @ManyToOne
    @JoinColumn(name = "shipping_address_id")
    private Adress shippingAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "shipping_method", nullable = false)
    private ShippingMethod shippingMethod;

    @Column(name = "carrier")
    private String carrier;

    @Column(name = "carrier_service_code")
    private String carrierServiceCode;

    @Column(name = "carrier_shipment_id")
    private String carrierShipmentId;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "shipping_status")
    private ShippingStatus shippingStatus;

    @Column(name = "estimated_delivery")
    private LocalDate estimatedDelivery;

    @Column(name = "shipping_cost")
    private float shippingCost;

    private String rawCarrierStatus;
}