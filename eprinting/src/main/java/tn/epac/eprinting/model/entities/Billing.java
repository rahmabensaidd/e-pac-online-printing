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