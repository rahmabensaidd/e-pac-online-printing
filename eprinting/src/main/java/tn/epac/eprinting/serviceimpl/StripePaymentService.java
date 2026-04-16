package tn.epac.eprinting.serviceimpl;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.CartResponseDto;
import tn.epac.eprinting.model.dtos.CheckoutOrderRequestDto;
import tn.epac.eprinting.model.dtos.CreatePaymentIntentRequest;
import tn.epac.eprinting.model.dtos.CreatePaymentIntentResponse;
import tn.epac.eprinting.model.dtos.OrderResponseDto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StripePaymentService {

    private final CartServiceImpl cartService;
    private final OrderServiceImpl orderService;

    public CreatePaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest request) throws StripeException {
        CartResponseDto cart = cartService.getCart(request.getCartId());

        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty or unavailable");
        }

        long amountInCents = BigDecimal.valueOf(cart.getTotalPrice())
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();

        if (amountInCents <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart total must be greater than zero");
        }

        CheckoutOrderRequestDto checkoutRequest = new CheckoutOrderRequestDto();
        checkoutRequest.setFullName(request.getFullName());
        checkoutRequest.setEmail(request.getEmail());
        checkoutRequest.setPhone(request.getPhone());
        checkoutRequest.setCompany(request.getCompany());
        checkoutRequest.setAddressLine1(request.getAddressLine1());
        checkoutRequest.setAddressLine2(request.getAddressLine2());
        checkoutRequest.setCity(request.getCity());
        checkoutRequest.setState(request.getState());
        checkoutRequest.setPostalCode(request.getPostalCode());
        checkoutRequest.setNotes(request.getNotes());
        checkoutRequest.setShippingMethod(request.getShippingMethod());
        checkoutRequest.setPaymentMethod("card");
        checkoutRequest.setConfirmPriceUpdate(request.getConfirmPriceUpdate());

        OrderResponseDto order = orderService.checkout(
                request.getCartId(),
                checkoutRequest,
                request.getEmail(),
                request.getUsername(),
                request.getRoles() != null ? request.getRoles() : List.of("user")
        );

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency("usd")
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .putMetadata("cartId", String.valueOf(request.getCartId()))
                .putMetadata("orderId", String.valueOf(order.getOrderId()))
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);

        return new CreatePaymentIntentResponse(
                paymentIntent.getClientSecret(),
                paymentIntent.getId(),
                order.getOrderId()
        );
    }
}