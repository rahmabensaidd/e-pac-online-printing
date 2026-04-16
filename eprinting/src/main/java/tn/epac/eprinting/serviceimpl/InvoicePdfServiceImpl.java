package tn.epac.eprinting.serviceimpl;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.entities.Invoice;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.repository.InvoiceRepository;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.service.InvoicePdfService;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Transactional
public class InvoicePdfServiceImpl implements InvoicePdfService {

    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    @Override
    public String generateAndStoreInvoicePdf(Long orderId) {
        System.out.println("✅ generateAndStoreInvoicePdf started for orderId = " + orderId);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        Invoice invoice = order.getInvoice();
        if (invoice == null) {
            throw new ResourceNotFoundException("Invoice not found for order id: " + orderId);
        }

        try {
            byte[] pdfBytes = generateInvoicePdf(order, invoice);

            String folderPath = "uploads/invoices";
            File folder = new File(folderPath);
            if (!folder.exists()) {
                folder.mkdirs();
            }

            String fileName = invoice.getInvoiceNumber() + ".pdf";
            String filePath = folderPath + "/" + fileName;

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                fos.write(pdfBytes);
            }

            invoice.setInvoicePdfPath(filePath);
            invoiceRepository.save(invoice);

            System.out.println("✅ Invoice PDF saved at: " + filePath);

            return filePath;
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Unable to generate invoice PDF", e);
        }
    }

    private byte[] generateInvoicePdf(Order order, Invoice invoice) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        Document document = new Document(PageSize.A4, 36, 36, 50, 36);
        PdfWriter.getInstance(document, outputStream);
        document.open();

        Font titleFont = new Font(Font.HELVETICA, 20, Font.BOLD, new Color(16, 33, 58));
        Font headingFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(16, 33, 58));
        Font bodyFont = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.DARK_GRAY);
        Font boldFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(16, 33, 58));

        Paragraph title = new Paragraph("Invoice", titleFont);
        title.setSpacingAfter(16f);
        document.add(title);

        PdfPTable metaTable = new PdfPTable(2);
        metaTable.setWidthPercentage(100);
        metaTable.setSpacingAfter(18f);
        metaTable.setWidths(new float[]{1.2f, 2.8f});

        addMetaCell(metaTable, "Invoice Number", headingFont, bodyFont, invoice.getInvoiceNumber());
        addMetaCell(metaTable, "Invoice Date", headingFont, bodyFont,
                invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DateTimeFormatter.ISO_DATE) : "-");
        addMetaCell(metaTable, "Due Date", headingFont, bodyFont,
                invoice.getDueDate() != null ? invoice.getDueDate().format(DateTimeFormatter.ISO_DATE) : "-");
        addMetaCell(metaTable, "Order Reference", headingFont, bodyFont, order.getReference());
        addMetaCell(metaTable, "Customer", headingFont, bodyFont,
                order.getUser() != null
                        ? ((order.getUser().getFirstName() != null ? order.getUser().getFirstName() : "") + " " +
                        (order.getUser().getLastName() != null ? order.getUser().getLastName() : "")).trim()
                        : "Unknown");
        addMetaCell(metaTable, "Email", headingFont, bodyFont,
                order.getUser() != null ? order.getUser().getEmail() : "-");

        document.add(metaTable);

        Paragraph itemsTitle = new Paragraph("Order Items", headingFont);
        itemsTitle.setSpacingAfter(10f);
        document.add(itemsTitle);

        PdfPTable itemsTable = new PdfPTable(4);
        itemsTable.setWidthPercentage(100);
        itemsTable.setSpacingAfter(18f);
        itemsTable.setWidths(new float[]{4f, 1f, 1.5f, 1.5f});

        addHeaderCell(itemsTable, "Item");
        addHeaderCell(itemsTable, "Qty");
        addHeaderCell(itemsTable, "Unit Price");
        addHeaderCell(itemsTable, "Line Total");

        if (order.getOrderLines() != null) {
            for (OrderLine line : order.getOrderLines()) {
                String titleText = line.getBook() != null ? line.getBook().getTitle() : "Untitled";
                addBodyCell(itemsTable, titleText);
                addBodyCell(itemsTable, String.valueOf(line.getQuantity()));
                addBodyCell(itemsTable, formatMoney(line.getUnitPrice() != null ? line.getUnitPrice().floatValue() : 0f));
                addBodyCell(itemsTable, formatMoney(line.getTotalPrice() != null ? line.getTotalPrice().floatValue() : 0f));
            }
        }

        document.add(itemsTable);

        PdfPTable totalsTable = new PdfPTable(2);
        totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalsTable.setWidthPercentage(42);
        totalsTable.setSpacingBefore(6f);
        totalsTable.setWidths(new float[]{2f, 1.5f});

        addTotalRow(totalsTable, "Total HT", formatMoney(invoice.getTotalHT()), false);
        addTotalRow(totalsTable, "TVA", formatMoney(invoice.getTvaAmount()), false);
        addTotalRow(totalsTable, "Total TTC", formatMoney(invoice.getTotalTTC()), true);

        document.add(totalsTable);

        Paragraph status = new Paragraph(
                "Payment Status: " + (invoice.isPaid() ? "Paid" : "Pending"),
                boldFont
        );
        status.setSpacingBefore(20f);
        document.add(status);

        document.close();
        return outputStream.toByteArray();
    }

    private void addMetaCell(PdfPTable table, String label, Font labelFont, Font valueFont, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "-", valueFont));

        styleCell(labelCell);
        styleCell(valueCell);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addHeaderCell(PdfPTable table, String text) {
        Font font = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(16, 33, 58));
        cell.setPadding(10f);
        cell.setBorderColor(new Color(230, 230, 230));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String text) {
        Font font = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.DARK_GRAY);
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", font));
        cell.setPadding(10f);
        cell.setBorderColor(new Color(230, 230, 230));
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addTotalRow(PdfPTable table, String label, String value, boolean strong) {
        Font labelFont = new Font(Font.HELVETICA, 10, strong ? Font.BOLD : Font.NORMAL, new Color(16, 33, 58));
        Font valueFont = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(16, 33, 58));

        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));

        styleCell(labelCell);
        styleCell(valueCell);

        labelCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void styleCell(PdfPCell cell) {
        cell.setPadding(9f);
        cell.setBorderColor(new Color(230, 230, 230));
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
    }

    private String formatMoney(float amount) {
        return String.format("$%.2f", amount);
    }
}