package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.ShippingMethod;
import tn.epac.eprinting.model.enums.ShippingStatus;

import java.math.BigDecimal;
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

    @Column(name = "recipient_full_name")
    private String recipientFullName;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(name = "recipient_phone")
    private String recipientPhone;

    @Column(name = "recipient_company")
    private String recipientCompany;

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

    @Column(name = "tracking_url", length = 2048)
    private String trackingUrl;

    @Column(name = "label_url", length = 2048)
    private String labelUrl;

    @Column(name = "selected_rate_id")
    private String selectedRateId;

    @Column(name = "selected_rate_service")
    private String selectedRateService;

    @Column(name = "selected_rate_currency")
    private String selectedRateCurrency;

    @Column(name = "selected_rate_amount", precision = 12, scale = 2)
    private BigDecimal selectedRateAmount;

    @Column(name = "test_shipment", nullable = false)
    private boolean testShipment;

    @Column(name = "simulated_shipment", nullable = false)
    private boolean simulatedShipment;

    @Enumerated(EnumType.STRING)
    @Column(name = "shipping_status")
    private ShippingStatus shippingStatus;

    @Column(name = "estimated_delivery")
    private LocalDate estimatedDelivery;

    @Column(name = "shipping_cost")
    private float shippingCost;
}
