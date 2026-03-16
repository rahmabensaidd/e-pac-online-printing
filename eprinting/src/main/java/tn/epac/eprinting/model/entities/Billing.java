package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.Embeddable;
import tn.epac.eprinting.model.enums.PaymentStatus;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class Billing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long billingId;

    private String billingAddress;

    private String paymentMethod;

    private String cardNumber;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    private LocalDate billingDate;
}