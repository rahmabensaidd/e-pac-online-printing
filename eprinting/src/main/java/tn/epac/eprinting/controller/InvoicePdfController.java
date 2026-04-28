package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.entities.Invoice;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.service.InvoicePdfService;

import java.io.File;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
@Slf4j
public class InvoicePdfController {

    private final OrderRepository orderRepository;
    private final InvoicePdfService invoicePdfService;

    @GetMapping("/{orderId}/download")
    public ResponseEntity<Resource> downloadInvoice(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        Invoice invoice = order.getInvoice();
        if (invoice == null) {
            throw new ResourceNotFoundException("Invoice not found for order id: " + orderId);
        }

        String filePath = invoice.getInvoicePdfPath();
        File file = (filePath == null || filePath.isBlank()) ? null : new File(filePath);
        if (file == null || !file.exists()) {
            log.warn("Invoice PDF fallback generation triggered for orderId={} (path={})", orderId, filePath);
            filePath = invoicePdfService.generateAndStoreInvoicePdf(orderId);
            file = new File(filePath);
            log.info("Invoice PDF fallback generation completed for orderId={} (newPath={})", orderId, filePath);
        }

        if (!file.exists()) {
            throw new ResourceNotFoundException("Invoice PDF file does not exist");
        }

        Resource resource = new FileSystemResource(file);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .body(resource);
    }
}
