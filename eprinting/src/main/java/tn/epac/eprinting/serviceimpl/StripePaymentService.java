package tn.epac.eprinting.serviceimpl;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.CartResponseDto;
import tn.epac.eprinting.model.dtos.CreatePaymentIntentRequest;
import tn.epac.eprinting.model.dtos.CreatePaymentIntentResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class StripePaymentService {

    private final CartServiceImpl cartService;
    private final OrderServiceImpl orderService;

    public CreatePaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest request) throws StripeException {
        orderService.revalidateCustomPricingForCart(request.getCartId(), request.getConfirmPriceUpdate());

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

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency("usd")
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .putMetadata("cartId", String.valueOf(request.getCartId()))
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);

        return new CreatePaymentIntentResponse(
                paymentIntent.getClientSecret(),
                paymentIntent.getId(),
                null
        );
    }
}
