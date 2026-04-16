package tn.epac.eprinting.service;

public interface InvoicePdfService {
    String generateAndStoreInvoicePdf(Long orderId);
}
