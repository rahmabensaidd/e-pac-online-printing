package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
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

import java.io.File;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoicePdfController {

    private final OrderRepository orderRepository;

    @GetMapping("/{orderId}/download")
    public ResponseEntity<Resource> downloadInvoice(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        Invoice invoice = order.getInvoice();
        if (invoice == null || invoice.getInvoicePdfPath() == null || invoice.getInvoicePdfPath().isBlank()) {
            throw new ResourceNotFoundException("Invoice PDF not found for order id: " + orderId);
        }

        File file = new File(invoice.getInvoicePdfPath());
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