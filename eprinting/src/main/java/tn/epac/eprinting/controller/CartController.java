package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.model.dtos.AddToCartRequestDto;
import tn.epac.eprinting.model.dtos.AddPricedCustomItemRequestDto;
import tn.epac.eprinting.model.dtos.CartResponseDto;
import tn.epac.eprinting.model.dtos.CustomBookPriceRequestDto;
import tn.epac.eprinting.model.dtos.CustomBookPriceResponseDto;
import tn.epac.eprinting.model.dtos.UpdateCartItemQuantityRequestDto;
import tn.epac.eprinting.serviceimpl.CartServiceImpl;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartServiceImpl cartService;

    @GetMapping("/{cartId}")
    public ResponseEntity<CartResponseDto> getCart(@PathVariable Long cartId) {
        return ResponseEntity.ok(cartService.getCart(cartId));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponseDto> addToCart(@RequestBody AddToCartRequestDto request) {
        return ResponseEntity.ok(
                cartService.addToCart(request.getCartId(), request.getBookId(), request.getQuantity())
        );
    }

    @PostMapping("/custom-pricing")
    public ResponseEntity<CustomBookPriceResponseDto> calculateCustomBookPricing(
            @RequestBody CustomBookPriceRequestDto request
    ) {
        return ResponseEntity.ok(cartService.calculateCustomBookPrice(request.getBookId(), request.getQuantity()));
    }

    @PostMapping("/custom-items/priced")
    public ResponseEntity<CartResponseDto> addPricedCustomItemToCart(
            @RequestBody AddPricedCustomItemRequestDto request
    ) {
        return ResponseEntity.ok(cartService.addPricedCustomItem(
                request.getCartId(),
                request.getBookId(),
                request.getQuantity(),
                request.getUnitPrice(),
                request.getTotalPrice(),
                request.getIsEstimated(),
                request.getCurrency(),
                request.getCalculatedAt()
        ));
    }

    @PatchMapping("/{cartId}/items/{orderLineId}")
    public ResponseEntity<CartResponseDto> updateCartItemQuantity(
            @PathVariable Long cartId,
            @PathVariable Long orderLineId,
            @RequestBody UpdateCartItemQuantityRequestDto request
    ) {
        return ResponseEntity.ok(cartService.updateQuantity(cartId, orderLineId, request.getQuantity()));
    }

    @DeleteMapping("/{cartId}/items/{orderLineId}")
    public ResponseEntity<CartResponseDto> removeCartItem(
            @PathVariable Long cartId,
            @PathVariable Long orderLineId
    ) {
        return ResponseEntity.ok(cartService.removeItem(cartId, orderLineId));
    }

    @DeleteMapping("/{cartId}")
    public ResponseEntity<CartResponseDto> clearCart(@PathVariable Long cartId) {
        return ResponseEntity.ok(cartService.clearCart(cartId));
    }
}
