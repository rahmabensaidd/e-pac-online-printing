package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.CartItemResponseDto;
import tn.epac.eprinting.model.dtos.CartResponseDto;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.Cart;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.CartRepository;
import tn.epac.eprinting.repository.OrderLineRepository;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CartServiceImpl {

    private final CartRepository cartRepository;
    private final OrderLineRepository orderLineRepository;
    private final BookRepository bookRepository;

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
                : orderLineRepository.findByCartCartIdAndBookBookId(cart.getCartId(), bookId).orElse(null);

        if (line == null) {
            line = OrderLine.builder()
                    .book(book)
                    .quantity(normalizedQuantity)
                    .unitPrice(BigDecimal.valueOf(book.getSalePrice()))
                    .build();
            line.calculateTotalPrice();
            cart.addItem(line);
        } else {
            line.setQuantity(line.getQuantity() + normalizedQuantity);
            line.setUnitPrice(BigDecimal.valueOf(book.getSalePrice()));
            line.calculateTotalPrice();
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
        line.setUnitPrice(BigDecimal.valueOf(line.getBook().getSalePrice()));
        line.calculateTotalPrice();
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
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice() != null ? line.getUnitPrice().floatValue() : 0f)
                .lineTotal(line.getTotalPrice() != null ? line.getTotalPrice().floatValue() : 0f)
                .build();
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
