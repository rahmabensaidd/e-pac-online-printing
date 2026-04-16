package tn.epac.eprinting.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Invoice;
import tn.epac.eprinting.model.entities.Order;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByOrder(Order order);
    Optional<Invoice> findByOrderOrderId(Long orderId);

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
}
