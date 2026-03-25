package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tn.epac.eprinting.model.enums.PaymentStatus;
import java.time.LocalDate;

/** Represents a billing record in the e-printing system.
 This entity stores all billing-related information for customer transactions,
 including payment details, billing address, and payment status tracking
 */

@Entity
@Getter
@Setter
public class Billing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long billingId;

    @ManyToOne
    private Adress billingAddress;

    private String paymentMethod;

    private String cardNumber;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    private LocalDate billingDate;
}