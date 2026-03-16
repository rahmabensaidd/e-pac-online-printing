package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

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

    private boolean isPaid;

    private LocalDate paymentDate;

    @OneToOne
    private Order order;
}