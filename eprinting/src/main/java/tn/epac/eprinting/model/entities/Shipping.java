package tn.epac.eprinting.model.entities;

import lombok.*;

import jakarta.persistence.*;
import tn.epac.eprinting.model.enums.ShippingStatus;

import java.time.LocalDate;
import java.util.Date;

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