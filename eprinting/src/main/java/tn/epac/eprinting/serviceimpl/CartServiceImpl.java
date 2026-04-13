package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.CartItemResponseDto;
import tn.epac.eprinting.model.dtos.CartResponseDto;
import tn.epac.eprinting.model.dtos.CustomBookPriceResponseDto;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.Cart;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.model.enums.CartItemSource;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.CartRepository;
import tn.epac.eprinting.repository.OrderLineRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CartServiceImpl {

    private final CartRepository cartRepository;
    private final OrderLineRepository orderLineRepository;
    private final BookRepository bookRepository;
    private final CustomBookPricingService customBookPricingService;
    private final OrderComputationService orderComputationService;

    public CartResponseDto getCart(Long cartId) {
        Cart cart = getActiveCart(cartId);
        cart.calculateTotal();
        return mapCart(cart, false);
    }

    public CartResponseDto addToCart(Long cartId, Long bookId, Integer quantity) {
        int normalizedQuantity = quantity == null || quantity < 1 ? 1 : quantity;
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        Cart cart = resolveCart(cartId);
        OrderLine line = cart.getCartId() == null
                ? null
                : orderLineRepository
                .findByCartCartIdAndBookBookIdAndItemSource(cart.getCartId(), bookId, CartItemSource.MARKETPLACE)
                .orElse(null);

        BigDecimal unitPrice = BigDecimal.valueOf(book.getSalePrice());
        if (line == null) {
            line = OrderLine.builder()
                    .book(book)
                    .quantity(normalizedQuantity)
                    .unitPrice(unitPrice)
                    .itemSource(CartItemSource.MARKETPLACE)
                    .isEstimated(false)
                    .currency("USD")
                    .calculatedAt(LocalDateTime.now())
                    .build();
            line.calculateTotalPrice();
            orderComputationService.initializeLineDefaults(line);
            cart.addItem(line);
        } else {
            line.setQuantity(line.getQuantity() + normalizedQuantity);
            line.setUnitPrice(unitPrice);
            line.setItemSource(CartItemSource.MARKETPLACE);
            line.setIsEstimated(false);
            line.setCurrency("USD");
            line.setCalculatedAt(LocalDateTime.now());
            line.calculateTotalPrice();
            orderComputationService.initializeLineDefaults(line);
        }

        cart.calculateTotal();
        Cart savedCart = cartRepository.save(cart);
        return mapCart(savedCart, false);
    }

    public CustomBookPriceResponseDto calculateCustomBookPrice(Long bookId, Integer quantity) {
        return customBookPricingService.calculateResponse(bookId, quantity);
    }

    public CartResponseDto addPricedCustomItem(
            Long cartId,
            Long bookId,
            Integer quantity,
            Float unitPrice,
            Float totalPrice,
            Boolean isEstimated,
            String currency,
            String calculatedAt
    ) {
        int normalizedQuantity = quantity == null || quantity < 1 ? 1 : quantity;
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        if (!book.is_created_by_user()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only custom books can be added with priced custom flow");
        }

        CustomBookPricingService.PricingQuote pricingQuote = null;
        if (unitPrice == null || unitPrice <= 0 || totalPrice == null || totalPrice <= 0) {
            pricingQuote = customBookPricingService.calculateQuote(bookId, normalizedQuantity);
        }

        BigDecimal normalizedUnitPrice = pricingQuote != null
                ? pricingQuote.getUnitPrice()
                : BigDecimal.valueOf(unitPrice).max(BigDecimal.ZERO);
        boolean estimated = pricingQuote != null
                ? pricingQuote.isEstimated()
                : Boolean.TRUE.equals(isEstimated);
        String normalizedCurrency = pricingQuote != null
                ? pricingQuote.getCurrency()
                : (currency == null || currency.isBlank() ? "USD" : currency.trim().toUpperCase());
        LocalDateTime normalizedCalculatedAt = pricingQuote != null
                ? pricingQuote.getCalculatedAt()
                : parseCalculatedAtOrNow(calculatedAt);

        Cart cart = resolveCart(cartId);
        OrderLine line = cart.getCartId() == null
                ? null
                : orderLineRepository
                .findByCartCartIdAndBookBookIdAndItemSource(cart.getCartId(), bookId, CartItemSource.CUSTOM)
                .orElse(null);

        if (line == null) {
            line = OrderLine.builder()
                    .book(book)
                    .quantity(normalizedQuantity)
                    .unitPrice(normalizedUnitPrice)
                    .itemSource(CartItemSource.CUSTOM)
                    .isEstimated(estimated)
                    .currency(normalizedCurrency)
                    .calculatedAt(normalizedCalculatedAt)
                    .build();
            line.calculateTotalPrice();
            orderComputationService.initializeLineDefaults(line);
            cart.addItem(line);
        } else {
            line.setQuantity(line.getQuantity() + normalizedQuantity);
            line.setUnitPrice(normalizedUnitPrice);
            line.setItemSource(CartItemSource.CUSTOM);
            line.setIsEstimated(estimated);
            line.setCurrency(normalizedCurrency);
            line.setCalculatedAt(normalizedCalculatedAt);
            line.calculateTotalPrice();
            orderComputationService.initializeLineDefaults(line);
        }

        cart.calculateTotal();
        Cart savedCart = cartRepository.save(cart);
        return mapCart(savedCart, false);
    }

    public CartResponseDto updateQuantity(Long cartId, Long orderLineId, Integer quantity) {
        int normalizedQuantity = quantity == null ? 1 : quantity;
        if (normalizedQuantity <= 0) {
            return removeItem(cartId, orderLineId);
        }

        Cart cart = getActiveCart(cartId);
        OrderLine line = orderLineRepository.findByOrderLineIdAndCartCartId(orderLineId, cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + orderLineId));

        line.setQuantity(normalizedQuantity);
        if (line.getItemSource() == null || line.getItemSource() == CartItemSource.MARKETPLACE) {
            line.setUnitPrice(BigDecimal.valueOf(line.getBook().getSalePrice()));
            line.setIsEstimated(false);
            line.setCurrency("USD");
            line.setCalculatedAt(LocalDateTime.now());
        }
        line.calculateTotalPrice();
        orderComputationService.initializeLineDefaults(line);
        cart.calculateTotal();
        Cart savedCart = cartRepository.save(cart);
        return mapCart(savedCart, false);
    }

    public CartResponseDto removeItem(Long cartId, Long orderLineId) {
        Cart cart = getActiveCart(cartId);
        OrderLine line = orderLineRepository.findByOrderLineIdAndCartCartId(orderLineId, cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + orderLineId));

        cart.removeItem(line);

        if (cart.isEmpty()) {
            cartRepository.delete(cart);
            return removedCartResponse();
        }

        Cart savedCart = cartRepository.save(cart);
        return mapCart(savedCart, false);
    }

    public CartResponseDto clearCart(Long cartId) {
        Cart cart = getActiveCart(cartId);
        cartRepository.delete(cart);
        return removedCartResponse();
    }

    private Cart resolveCart(Long cartId) {
        if (cartId == null) {
            return Cart.builder()
                    .totalPrice(BigDecimal.ZERO)
                    .build();
        }

        return getActiveCart(cartId);
    }

    private Cart getActiveCart(Long cartId) {
        return cartRepository.findActiveCartById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Active cart not found with id: " + cartId));
    }

    private CartResponseDto mapCart(Cart cart, boolean removed) {
        List<CartItemResponseDto> items = cart.getItems() == null
                ? List.of()
                : cart.getItems().stream()
                .map(this::mapItem)
                .toList();

        return CartResponseDto.builder()
                .cartId(cart.getCartId())
                .totalPrice(cart.getCalculatedTotal().floatValue())
                .itemCount(items.stream().mapToInt(CartItemResponseDto::getQuantity).sum())
                .removed(removed)
                .items(items)
                .build();
    }

    private CartItemResponseDto mapItem(OrderLine line) {
        return CartItemResponseDto.builder()
                .orderLineId(line.getOrderLineId())
                .bookId(line.getBook() != null ? line.getBook().getBookId() : null)
                .title(line.getBook() != null ? line.getBook().getTitle() : "Untitled book")
                .description(line.getBook() != null ? line.getBook().getDescription() : "")
                .bindingType(line.getBook() != null && line.getBook().getBindingType() != null
                        ? line.getBook().getBindingType().name()
                        : null)
                .itemSource(line.getItemSource() != null ? line.getItemSource().name() : CartItemSource.MARKETPLACE.name())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice() != null ? line.getUnitPrice().floatValue() : 0f)
                .lineTotal(line.getTotalPrice() != null ? line.getTotalPrice().floatValue() : 0f)
                .isEstimated(Boolean.TRUE.equals(line.getIsEstimated()))
                .currency(line.getCurrency())
                .calculatedAt(line.getCalculatedAt() != null ? line.getCalculatedAt().toString() : null)
                .build();
    }

    private LocalDateTime parseCalculatedAtOrNow(String calculatedAt) {
        if (calculatedAt == null || calculatedAt.isBlank()) {
            return LocalDateTime.now();
        }
        try {
            return LocalDateTime.parse(calculatedAt);
        } catch (DateTimeParseException ignored) {
            return LocalDateTime.now();
        }
    }

    private CartResponseDto removedCartResponse() {
        return CartResponseDto.builder()
                .cartId(null)
                .totalPrice(0f)
                .itemCount(0)
                .removed(true)
                .items(List.of())
                .build();
    }
}
