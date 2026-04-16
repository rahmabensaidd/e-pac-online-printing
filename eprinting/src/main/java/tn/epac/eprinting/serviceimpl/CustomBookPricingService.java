package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.CustomBookPriceResponseDto;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.enums.BindingType;
import tn.epac.eprinting.repository.BookRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomBookPricingService {

    private static final String DEFAULT_CURRENCY = "USD";

    private final BookRepository bookRepository;

    @Value("${pricing.custom.force-failure:false}")
    private boolean forceFailure;

    @Value("${pricing.custom.default-unit-price:14.90}")
    private BigDecimal defaultUnitPrice;

    public PricingQuote calculateQuote(Long bookId, Integer quantity) {
        int normalizedQuantity = quantity == null || quantity < 1 ? 1 : quantity;

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Custom book not found"));

        if (!book.is_created_by_user()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only custom books can use this pricing endpoint");
        }

        try {
            if (forceFailure) {
                throw new IllegalStateException("Pricing API is currently unavailable");
            }

            BigDecimal unit = calculatePrimaryPrice(book, normalizedQuantity);
            BigDecimal total = unit.multiply(BigDecimal.valueOf(normalizedQuantity)).setScale(2, RoundingMode.HALF_UP);
            LocalDateTime calculatedAt = LocalDateTime.now();
            return PricingQuote.builder()
                    .bookId(book.getBookId())
                    .quantity(normalizedQuantity)
                    .unitPrice(unit)
                    .totalPrice(total)
                    .estimated(false)
                    .currency(DEFAULT_CURRENCY)
                    .calculatedAt(calculatedAt)
                    .message(null)
                    .build();
        } catch (Exception ignored) {
            BigDecimal unit = calculateFallbackPrice(book);
            BigDecimal total = unit.multiply(BigDecimal.valueOf(normalizedQuantity)).setScale(2, RoundingMode.HALF_UP);
            LocalDateTime calculatedAt = LocalDateTime.now();
            return PricingQuote.builder()
                    .bookId(book.getBookId())
                    .quantity(normalizedQuantity)
                    .unitPrice(unit)
                    .totalPrice(total)
                    .estimated(true)
                    .currency(DEFAULT_CURRENCY)
                    .calculatedAt(calculatedAt)
                    .message("Estimated price applied")
                    .build();
        }
    }

    public CustomBookPriceResponseDto calculateResponse(Long bookId, Integer quantity) {
        PricingQuote quote = calculateQuote(bookId, quantity);
        return CustomBookPriceResponseDto.builder()
                .bookId(quote.getBookId())
                .quantity(quote.getQuantity())
                .unitPrice(quote.getUnitPrice().floatValue())
                .totalPrice(quote.getTotalPrice().floatValue())
                .isEstimated(quote.isEstimated())
                .currency(quote.getCurrency())
                .calculatedAt(quote.getCalculatedAt().toString())
                .message(quote.getMessage())
                .build();
    }

    private BigDecimal calculatePrimaryPrice(Book book, int quantity) {
        BigDecimal base = resolveBasePrice(book);
        BigDecimal pageCost = BigDecimal.valueOf(safePositive(book.getProductionPage()) * 0.045d);
        BigDecimal areaCost = BigDecimal.valueOf(
                (safePositive(book.getWidth()) * safePositive(book.getHeight())) / 10000d * 0.08d
        );
        BigDecimal thicknessCost = BigDecimal.valueOf(safePositive(book.getThickness()) * 0.02d);
        BigDecimal bindingCost = BigDecimal.valueOf(bindingSurcharge(book.getBindingType()));

        BigDecimal unit = base
                .add(pageCost)
                .add(areaCost)
                .add(thicknessCost)
                .add(bindingCost);

        if (quantity >= 100) {
            unit = unit.multiply(BigDecimal.valueOf(0.9d));
        } else if (quantity >= 25) {
            unit = unit.multiply(BigDecimal.valueOf(0.95d));
        }

        return unit.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateFallbackPrice(Book book) {
        double pages = safePositive(book.getProductionPage());
        double fallback = defaultUnitPrice.doubleValue() + (pages * 0.02d);
        return BigDecimal.valueOf(fallback).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveBasePrice(Book book) {
        if (book.getSalePrice() > 0) {
            return BigDecimal.valueOf(book.getSalePrice());
        }
        return BigDecimal.valueOf(12.50d);
    }

    private int safePositive(Integer value) {
        return value == null || value < 0 ? 0 : value;
    }

    private double bindingSurcharge(BindingType bindingType) {
        if (bindingType == null) {
            return 0d;
        }

        return switch (bindingType) {
            case CASEBIND, CASEBIND_ES, CASEBIND_INS, CASEBIND_ES_INS -> 3.5d;
            case PERFECT, PERFECT_INS, PERFECT_NC, PERFECT_NC_INS -> 2.2d;
            case COILHARD, COILHARD_INS, COILHARD_TAB, COILSOFT -> 1.6d;
            case LOOSELEAF, LOOSELEAF_INS, LOOSELEAF_NC, LOOSELEAF_NC_INS, LOOSELEAF_NC_TAB -> 1.2d;
            case SS -> 1.0d;
            case CARD, DIVIDER_SHEET, NONE -> 0.4d;
        };
    }

    @lombok.Data
    @lombok.Builder
    public static class PricingQuote {
        private Long bookId;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private boolean estimated;
        private String currency;
        private LocalDateTime calculatedAt;
        private String message;
    }
}
