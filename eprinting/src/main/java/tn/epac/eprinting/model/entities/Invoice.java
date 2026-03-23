package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.OneToOne;
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

    private boolean isPaid;

    private LocalDate paymentDate;

    @OneToOne
    private Order order;
}