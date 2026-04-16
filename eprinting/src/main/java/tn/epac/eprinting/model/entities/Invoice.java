package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Invoice entity - represents a commercial invoice for an order.
 * Contains tax calculation (HT, TVA, TTC) and payment tracking.
 */
@Entity
@Getter
@Setter
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long invoiceId;

    private String invoiceNumber;

    private LocalDate invoiceDate;

    private LocalDate dueDate;

    private float totalHT;

    private float tvaRate;

    private float tvaAmount;

    private float totalTTC;

    private boolean paid;

    private LocalDate paymentDate;

     private String invoicePdfPath;
    @OneToOne(mappedBy = "invoice")
    private Order order;
}