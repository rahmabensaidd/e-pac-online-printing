package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Billing;
import tn.epac.eprinting.model.enums.PaymentStatus;

import java.util.List;

public interface BillingRepository extends JpaRepository<Billing, Long> {

    List<Billing> findByPaymentStatus(PaymentStatus status);
}
