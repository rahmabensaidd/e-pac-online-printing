package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
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

    private Adress billingAddress;

    private String paymentMethod;

    private String cardNumber;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    private LocalDate billingDate;
}