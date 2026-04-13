package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.AdminOrderResponseDto;
import tn.epac.eprinting.model.dtos.CheckoutOrderRequestDto;
import tn.epac.eprinting.model.dtos.OrderLineResponseDto;
import tn.epac.eprinting.model.dtos.OrderResponseDto;
import tn.epac.eprinting.model.dtos.OrderStatsDto;
import tn.epac.eprinting.model.dtos.OrderTrackingResponseDto;
import tn.epac.eprinting.model.dtos.OrderUpdateRequestDto;
import tn.epac.eprinting.model.entities.Adress;
import tn.epac.eprinting.model.entities.Billing;
import tn.epac.eprinting.model.entities.Cart;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.model.entities.Shipping;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.CartItemSource;
import tn.epac.eprinting.model.enums.OrderLineStatus;
import tn.epac.eprinting.model.enums.OrderPriority;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.OrderValidationStatus;
import tn.epac.eprinting.model.enums.PaymentStatus;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.model.enums.ShippingStatus;
import tn.epac.eprinting.repository.AdressRepository;
import tn.epac.eprinting.repository.BillingRepository;
import tn.epac.eprinting.repository.CartRepository;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.repository.ShippingRepository;
import tn.epac.eprinting.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final AdressRepository adressRepository;
    private final BillingRepository billingRepository;
    private final ShippingRepository shippingRepository;
    private final CustomBookPricingService customBookPricingService;
    private final OrderComputationService orderComputationService;

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public OrderResponseDto checkout(
            Long cartId,
            CheckoutOrderRequestDto request,
            String email,
            String username,
            List<String> roles
    ) {
        Cart cart = cartRepository.findActiveCartById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Active cart not found with id: " + cartId));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new IllegalStateException("Cannot checkout an empty cart");
        }
        revalidateCustomPricing(cart, request);

        User user = resolveUser(email, username, request, roles);
        Adress shippingAddress = adressRepository.save(buildAddress(request));

        Billing billing = new Billing();
        billing.setBillingAddress(shippingAddress);
        billing.setPaymentMethod(request.getPaymentMethod());
        billing.setPaymentStatus(PaymentStatus.PENDING);
        billing.setBillingDate(LocalDate.now());
        billing = billingRepository.save(billing);

        Shipping shipping = new Shipping();
        shipping.setShippingAddress(shippingAddress);
        shipping.setShippingMethod(request.getShippingMethod());
        shipping.setShippingStatus(ShippingStatus.PENDING);
        shipping.setEstimatedDelivery(LocalDate.now().plusDays("express".equalsIgnoreCase(request.getShippingMethod()) ? 2 : 5));
        shipping.setShippingCost("express".equalsIgnoreCase(request.getShippingMethod()) ? 18f : 8.5f);
        shipping = shippingRepository.save(shipping);

        List<OrderLine> orderLines = cart.getItems().stream()
                .map(this::copyOrderLine)
                .peek(orderComputationService::initializeLineDefaults)
                .toList();

        Order order = new Order();
        order.setOrderDate(LocalDate.now());
        order.setReference(generateOrderReference());
        order.setUser(user);
        order.setBilling(billing);
        order.setShipping(shipping);
        order.setOrderLines(orderLines);
        order.setTotalAmount(cart.getCalculatedTotal().floatValue());
        recomputeAggregates(order);

        Order savedOrder = orderRepository.save(order);
        cartRepository.delete(cart);
        return mapToOrderResponse(savedOrder);
    }

    public List<OrderResponseDto> getCurrentUserOrders(String email, String username) {
        User user = resolveCurrentUser(email, username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return orderRepository.findByUserUserIdOrderByOrderDateDesc(user.getUserId())
                .stream()
                .map(this::mapToOrderResponse)
                .toList();
    }

    public OrderTrackingResponseDto getTrackingForCurrentUser(Long orderId, String email, String username) {
        User user = resolveCurrentUser(email, username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getUser() == null || !Objects.equals(order.getUser().getUserId(), user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this order");
        }

        return mapToTrackingResponse(order);
    }

    public AdminOrderResponseDto updateOrderLineValidation(Long orderId, Long orderLineId, OrderValidationStatus validationStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        OrderLine targetLine = order.getOrderLines().stream()
                .filter(line -> Objects.equals(line.getOrderLineId(), orderLineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Order line not found with id: " + orderLineId));

        if (!targetLine.isCustomItem()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only custom lines can be validated/rejected");
        }

        targetLine.setValidationStatus(validationStatus == null ? OrderValidationStatus.PENDING : validationStatus);
        recomputeAggregates(order);
        Order saved = orderRepository.save(order);
        return mapToAdminResponseDto(saved);
    }

    public AdminOrderResponseDto updateOrderLineProductionStatus(Long orderId, Long orderLineId, OrderLineStatus lineStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        OrderLine targetLine = order.getOrderLines().stream()
                .filter(line -> Objects.equals(line.getOrderLineId(), orderLineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Order line not found with id: " + orderLineId));

        if (!targetLine.isCustomItem()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Marketplace lines are always READY");
        }

        targetLine.setLineStatus(lineStatus == null ? OrderLineStatus.PRINTING : lineStatus);
        recomputeAggregates(order);
        Order saved = orderRepository.save(order);
        return mapToAdminResponseDto(saved);
    }

    public Page<AdminOrderResponseDto> getAllOrdersAdmin(
            Pageable pageable,
            String status,
            String search
    ) {
        Page<Order> orders;

        if (status != null && !status.isBlank()) {
            try {
                OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase(Locale.ROOT));
                orders = orderRepository.findByStatus(orderStatus, pageable);
            } catch (IllegalArgumentException e) {
                orders = Page.empty(pageable);
            }
        } else if (search != null && !search.isBlank()) {
            orders = orderRepository.searchOrders(search, pageable);
        } else {
            orders = orderRepository.findAll(pageable);
        }

        return orders.map(this::mapToAdminResponseDto);
    }

    public AdminOrderResponseDto getOrderByIdForAdmin(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        return mapToAdminResponseDto(order);
    }

    public AdminOrderResponseDto createOrder(OrderUpdateRequestDto request) {
        Order order = new Order();
        order.setOrderDate(LocalDate.now());
        order.setReference(generateOrderReference());
        order.setStatus(request.getStatus() != null ? request.getStatus() : OrderStatus.READY_TO_SHIP);
        order.setPriority(parseOrderPriority(request.getPriority()));
        order.setValidationStatus(OrderValidationStatus.VALIDATED);
        order.setTotalAmount(request.getTotal() != null ? request.getTotal().floatValue() : 0f);

        User assigneeUser = resolveAssigneeUser(request.getAssignee(), request.getCompanyName());
        order.setUser(assigneeUser);

        Billing billing = new Billing();
        billing.setPaymentMethod(request.getShippingMethod() != null ? request.getShippingMethod() : "Standard");
        billing.setPaymentStatus(request.getPaymentStatus() != null ? request.getPaymentStatus() : PaymentStatus.PENDING);
        billing.setBillingDate(LocalDate.now());
        billing = billingRepository.save(billing);
        order.setBilling(billing);

        Shipping shipping = new Shipping();
        shipping.setShippingMethod(request.getShippingMethod() != null ? request.getShippingMethod() : "Standard");
        shipping.setShippingStatus(ShippingStatus.PENDING);
        shipping.setEstimatedDelivery(LocalDate.now().plusDays(5));
        shipping.setShippingCost(8.5f);
        shipping = shippingRepository.save(shipping);
        order.setShipping(shipping);

        Order savedOrder = orderRepository.save(order);
        return mapToAdminResponseDto(savedOrder);
    }

    public AdminOrderResponseDto updateOrder(Long orderId, OrderUpdateRequestDto request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (request.getStatus() != null) {
            order.setStatus(request.getStatus());
        }
        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            order.setPriority(parseOrderPriority(request.getPriority()));
        }
        if (request.getTotal() != null) {
            order.setTotalAmount(request.getTotal().floatValue());
        }
        if (request.getPaymentStatus() != null && order.getBilling() != null) {
            order.getBilling().setPaymentStatus(request.getPaymentStatus());
        }
        if (request.getAssignee() != null && !request.getAssignee().isBlank()) {
            String companyName = request.getCompanyName();
            if ((companyName == null || companyName.isBlank()) && order.getUser() != null) {
                companyName = order.getUser().getCompanyName();
            }
            order.setUser(resolveAssigneeUser(request.getAssignee(), companyName));
        }
        if (request.getValidationStatus() != null) {
            order.setValidationStatus(request.getValidationStatus());
        }

        if (order.getOrderLines() != null && !order.getOrderLines().isEmpty()) {
            recomputeAggregates(order);
        }

        Order updatedOrder = orderRepository.save(order);
        return mapToAdminResponseDto(updatedOrder);
    }

    public void deleteOrder(Long orderId) {
        if (!orderRepository.existsById(orderId)) {
            throw new ResourceNotFoundException("Order not found with id: " + orderId);
        }
        orderRepository.deleteById(orderId);
    }

    public OrderStatsDto getOrderStats() {
        long totalOrders = orderRepository.count();
        long printingOrders = orderRepository.countByStatus(OrderStatus.PRINTING);
        long readyToShipOrders = orderRepository.countByStatus(OrderStatus.READY_TO_SHIP);
        long shippedOrders = orderRepository.countByStatus(OrderStatus.SHIPPED);
        long rejectedOrders = orderRepository.countByStatus(OrderStatus.REJECTED);
        long cancelledOrders = orderRepository.countByStatus(OrderStatus.CANCELLED);

        BigDecimal productionValue = orderRepository.sumTotalAmountByExcludedStatuses(
                OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REJECTED
        );
        if (productionValue == null) {
            productionValue = BigDecimal.ZERO;
        }

        return OrderStatsDto.builder()
                .totalOrders(totalOrders)
                .pendingOrders(printingOrders)
                .processingOrders(readyToShipOrders)
                .shippedOrders(shippedOrders)
                .deliveredOrders(rejectedOrders)
                .cancelledOrders(cancelledOrders)
                .productionValue(productionValue)
                .build();
    }

    private String generateOrderReference() {
        String year = String.valueOf(LocalDate.now().getYear()).substring(2);
        long count = orderRepository.count() + 1;
        return String.format("ORD-%s-%05d", year, count);
    }

    private OrderResponseDto mapToOrderResponse(Order order) {
        return OrderResponseDto.builder()
                .orderId(order.getOrderId())
                .reference(order.getReference())
                .orderDate(order.getOrderDate())
                .status(order.getStatus())
                .priority(resolveOrderPriority(order))
                .validationStatus(resolveOrderValidation(order))
                .shippingStatus(order.getShipping() != null && order.getShipping().getShippingStatus() != null
                        ? order.getShipping().getShippingStatus().name()
                        : null)
                .trackingNumber(order.getShipping() != null ? order.getShipping().getTrackingNumber() : null)
                .carrier(order.getShipping() != null ? order.getShipping().getShippingMethod() : null)
                .totalAmount(order.getTotalAmount())
                .customerEmail(order.getUser() != null ? order.getUser().getEmail() : null)
                .items(order.getOrderLines() == null ? List.of() : order.getOrderLines().stream().map(this::mapOrderLine).toList())
                .build();
    }

    private AdminOrderResponseDto mapToAdminResponseDto(Order order) {
        return AdminOrderResponseDto.builder()
                .orderId(order.getOrderId())
                .reference(order.getReference() != null ? order.getReference() : generateOrderReference())
                .customerName(order.getUser() != null
                        ? (order.getUser().getFirstName() + " " + order.getUser().getLastName()).trim()
                        : "Unknown")
                .companyName(order.getUser() != null && order.getUser().getCompanyName() != null ? order.getUser().getCompanyName() : "")
                .channel("Marketplace")
                .submittedAt(order.getOrderDate())
                .dueDate(order.getOrderDate() != null ? order.getOrderDate().plusDays(5) : LocalDate.now().plusDays(5))
                .total(order.getTotalAmount() != 0 ? BigDecimal.valueOf(order.getTotalAmount()) : BigDecimal.ZERO)
                .status(order.getStatus())
                .validationStatus(resolveOrderValidation(order))
                .priority(toPriorityLabel(resolveOrderPriority(order)))
                .assignee(getAssigneeFromOrder(order))
                .items(order.getOrderLines() != null ? order.getOrderLines().size() : 0)
                .shippingMethod(order.getShipping() != null ? order.getShipping().getShippingMethod() : "Standard")
                .paymentStatus(order.getBilling() != null ? order.getBilling().getPaymentStatus() : PaymentStatus.PENDING)
                .notes("")
                .orderLines(order.getOrderLines() != null
                        ? order.getOrderLines().stream().map(this::mapOrderLine).toList()
                        : List.of())
                .build();
    }

    private OrderTrackingResponseDto mapToTrackingResponse(Order order) {
        List<OrderTrackingResponseDto.ProductionLineDto> productionLines = order.getOrderLines() == null
                ? List.of()
                : order.getOrderLines().stream()
                .filter(OrderLine::isCustomItem)
                .map(line -> OrderTrackingResponseDto.ProductionLineDto.builder()
                        .orderLineId(line.getOrderLineId())
                        .bookId(line.getBook() != null ? line.getBook().getBookId() : null)
                        .bookTitle(line.getBook() != null ? line.getBook().getTitle() : "Untitled")
                        .type("Custom")
                        .quantity(line.getQuantity())
                        .productionStatus(line.getLineStatus() != null ? line.getLineStatus().name() : OrderLineStatus.PRINTING.name())
                        .build())
                .toList();

        List<OrderTrackingResponseDto.ShippingLineDto> shippingLines = order.getOrderLines() == null
                ? List.of()
                : order.getOrderLines().stream()
                .map(line -> OrderTrackingResponseDto.ShippingLineDto.builder()
                        .orderLineId(line.getOrderLineId())
                        .bookId(line.getBook() != null ? line.getBook().getBookId() : null)
                        .bookTitle(line.getBook() != null ? line.getBook().getTitle() : "Untitled")
                        .type(line.isCustomItem() ? "Custom" : "Marketplace")
                        .quantity(line.getQuantity())
                        .productionStatus(line.getLineStatus() != null ? line.getLineStatus().name() : OrderLineStatus.READY.name())
                        .unitPrice(line.getUnitPrice() != null ? line.getUnitPrice().floatValue() : 0f)
                        .totalPrice(line.getTotalPrice() != null ? line.getTotalPrice().floatValue() : 0f)
                        .estimatedPrice(Boolean.TRUE.equals(line.getIsEstimated()))
                        .build())
                .toList();

        return OrderTrackingResponseDto.builder()
                .orderId(order.getOrderId())
                .orderNumber(order.getReference())
                .orderDate(order.getOrderDate())
                .priority(resolveOrderPriority(order))
                .globalStatus(order.getStatus())
                .shippingStatus(order.getShipping() != null && order.getShipping().getShippingStatus() != null
                        ? order.getShipping().getShippingStatus().name()
                        : null)
                .carrier(order.getShipping() != null ? order.getShipping().getShippingMethod() : null)
                .trackingNumber(order.getShipping() != null ? order.getShipping().getTrackingNumber() : null)
                .productionLines(productionLines)
                .shippingLines(shippingLines)
                .build();
    }

    private String getAssigneeFromOrder(Order order) {
        if (order.getUser() == null || order.getUser().getUsername() == null || order.getUser().getUsername().isBlank()) {
            return "";
        }
        return order.getUser().getUsername();
    }

    private User resolveAssigneeUser(String assignee, String companyName) {
        String usernameCandidate = toUsernameCandidate(assignee, null, assignee);

        if (usernameCandidate != null && !usernameCandidate.isBlank()) {
            User existingByUsername = userRepository.findByUsernameIgnoreCase(usernameCandidate).orElse(null);
            if (existingByUsername != null) {
                if (companyName != null && !companyName.isBlank()) {
                    existingByUsername.setCompanyName(companyName);
                    return userRepository.save(existingByUsername);
                }
                return existingByUsername;
            }
        }

        if (assignee != null && assignee.contains("@")) {
            User existingByEmail = userRepository.findByEmail(assignee).orElse(null);
            if (existingByEmail != null) {
                if ((existingByEmail.getUsername() == null || existingByEmail.getUsername().isBlank())
                        && usernameCandidate != null
                        && !usernameCandidate.isBlank()) {
                    existingByEmail.setUsername(usernameCandidate);
                }
                if (companyName != null && !companyName.isBlank()) {
                    existingByEmail.setCompanyName(companyName);
                }
                return userRepository.save(existingByEmail);
            }
        }

        User newAssignee = new User();
        String[] names = splitName(assignee);
        newAssignee.setFirstName(names[0]);
        newAssignee.setLastName(names[1]);
        newAssignee.setUsername(usernameCandidate);
        newAssignee.setEmail(buildSystemEmailForUsername(usernameCandidate));
        newAssignee.setCompanyName(companyName);
        newAssignee.setRegistrationDate(LocalDate.now());
        newAssignee.setRole(Role.ADMIN);
        return userRepository.save(newAssignee);
    }

    private String toUsernameCandidate(String preferredUsername, String fallbackEmail, String fallbackFullName) {
        if (preferredUsername != null && !preferredUsername.isBlank()) {
            String value = preferredUsername.trim();
            if (value.contains("@")) {
                return value.substring(0, value.indexOf('@')).trim();
            }
            return value;
        }
        if (fallbackEmail != null && !fallbackEmail.isBlank() && fallbackEmail.contains("@")) {
            return fallbackEmail.substring(0, fallbackEmail.indexOf('@')).trim();
        }
        if (fallbackFullName != null && !fallbackFullName.isBlank()) {
            return fallbackFullName.trim();
        }
        return "user";
    }

    private String buildSystemEmailForUsername(String username) {
        String normalized = (username == null || username.isBlank()) ? "user" : username.trim().toLowerCase(Locale.ROOT);
        return normalized.replace(' ', '.') + "@epac.local";
    }

    private OrderPriority resolveOrderPriority(Order order) {
        if (order.getPriority() != null) {
            return orderComputationService.normalizePriority(order.getPriority());
        }
        return orderComputationService.computeOrderPriority(order.getOrderLines());
    }

    private OrderValidationStatus resolveOrderValidation(Order order) {
        if (order.getValidationStatus() != null) {
            return order.getValidationStatus();
        }
        return orderComputationService.computeOrderValidationStatus(order.getOrderLines());
    }

    private OrderPriority parseOrderPriority(String value) {
        return OrderPriority.fromString(value);
    }

    private String toPriorityLabel(OrderPriority priority) {
        return switch (orderComputationService.normalizePriority(priority)) {
            case HIGH3 -> "High3";
            case HIGH2 -> "High2";
            case HIGH1 -> "High1";
            default -> "Normal";
        };
    }

    private void recomputeAggregates(Order order) {
        if (order.getOrderLines() == null) {
            order.setOrderLines(List.of());
        }

        order.getOrderLines().forEach(orderComputationService::initializeLineDefaults);
        order.setStatus(orderComputationService.computeGlobalStatusFromLines(order.getOrderLines()));
        order.setPriority(orderComputationService.computeOrderPriority(order.getOrderLines()));
        order.setValidationStatus(orderComputationService.computeOrderValidationStatus(order.getOrderLines()));
    }

    private OrderLine copyOrderLine(OrderLine cartLine) {
        return OrderLine.builder()
                .book(cartLine.getBook())
                .quantity(cartLine.getQuantity())
                .unitPrice(cartLine.getUnitPrice())
                .totalPrice(cartLine.getTotalPrice())
                .itemSource(cartLine.getItemSource())
                .isEstimated(cartLine.getIsEstimated())
                .currency(cartLine.getCurrency())
                .calculatedAt(cartLine.getCalculatedAt())
                .lineStatus(cartLine.getLineStatus())
                .priority(cartLine.getPriority())
                .validationStatus(cartLine.getValidationStatus())
                .build();
    }

    private OrderLineResponseDto mapOrderLine(OrderLine line) {
        return OrderLineResponseDto.builder()
                .orderLineId(line.getOrderLineId())
                .bookId(line.getBook() != null ? line.getBook().getBookId() : null)
                .title(line.getBook() != null ? line.getBook().getTitle() : null)
                .itemSource(line.getItemSource() != null ? line.getItemSource().name() : CartItemSource.MARKETPLACE.name())
                .lineStatus(line.getLineStatus() != null ? line.getLineStatus().name() : null)
                .priority(line.getPriority() != null ? orderComputationService.normalizePriority(line.getPriority()).name() : OrderPriority.NORMAL.name())
                .validationStatus(line.getValidationStatus() != null ? line.getValidationStatus().name() : OrderValidationStatus.PENDING.name())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice() != null ? line.getUnitPrice().floatValue() : 0f)
                .totalPrice(line.getTotalPrice() != null ? line.getTotalPrice().floatValue() : 0f)
                .isEstimated(Boolean.TRUE.equals(line.getIsEstimated()))
                .currency(line.getCurrency())
                .build();
    }

    private void revalidateCustomPricing(Cart cart, CheckoutOrderRequestDto request) {
        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            return;
        }

        boolean confirmPriceUpdate = Boolean.TRUE.equals(request.getConfirmPriceUpdate());
        boolean hasPriceDiff = false;

        for (OrderLine line : cart.getItems()) {
            if (line == null || line.getBook() == null || line.getBook().getBookId() == null) {
                continue;
            }
            if (line.getItemSource() != CartItemSource.CUSTOM) {
                continue;
            }

            CustomBookPricingService.PricingQuote quote = customBookPricingService.calculateQuote(
                    line.getBook().getBookId(),
                    line.getQuantity()
            );

            boolean changed = hasPriceChanged(line.getUnitPrice(), quote.getUnitPrice())
                    || hasPriceChanged(line.getTotalPrice(), quote.getTotalPrice());

            if (changed) {
                hasPriceDiff = true;
            }

            if (!changed && !Boolean.TRUE.equals(line.getIsEstimated())) {
                continue;
            }

            line.setUnitPrice(quote.getUnitPrice());
            line.setTotalPrice(quote.getTotalPrice());
            line.setIsEstimated(quote.isEstimated());
            line.setCurrency(quote.getCurrency());
            line.setCalculatedAt(quote.getCalculatedAt());
        }

        if (hasPriceDiff) {
            cart.calculateTotal();
            cartRepository.save(cart);
            if (!confirmPriceUpdate) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Final price updated, please confirm");
            }
        }
    }

    private boolean hasPriceChanged(BigDecimal left, BigDecimal right) {
        if (left == null || right == null) {
            return true;
        }
        return left.setScale(2, java.math.RoundingMode.HALF_UP)
                .compareTo(right.setScale(2, java.math.RoundingMode.HALF_UP)) != 0;
    }

    private User resolveUser(String email, String username, CheckoutOrderRequestDto request, List<String> roles) {
        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email)
                    .map(existingUser -> updateExistingUser(existingUser, username, request, roles))
                    .orElseGet(() -> createUser(email, username, request, roles));
        }

        if (username != null && !username.isBlank()) {
            return userRepository.findByUsernameIgnoreCase(username)
                    .map(existingUser -> updateExistingUser(existingUser, username, request, roles))
                    .orElseGet(() -> createUser(buildSystemEmailForUsername(username), username, request, roles));
        }

        String fallbackEmail = buildSystemEmailForUsername("guest-user");
        return userRepository.findByEmail(fallbackEmail)
                .orElseGet(() -> createUser(fallbackEmail, "guest-user", request, roles));
    }

    private Optional<User> resolveCurrentUser(String email, String username) {
        if (email != null && !email.isBlank()) {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                return byEmail;
            }
        }
        if (username != null && !username.isBlank()) {
            return userRepository.findByUsernameIgnoreCase(username);
        }
        return Optional.empty();
    }

    private User updateExistingUser(User user, String username, CheckoutOrderRequestDto request, List<String> roles) {
        String[] names = splitName(request.getFullName());
        user.setFirstName(names[0]);
        user.setLastName(names[1]);
        if (request.getCompany() != null && !request.getCompany().isBlank()) {
            user.setCompanyName(request.getCompany());
        }
        if (user.getUsername() == null || user.getUsername().isBlank()) {
            user.setUsername(toUsernameCandidate(username, user.getEmail(), request.getFullName()));
        }
        user.setRole(resolveRole(roles));
        return userRepository.save(user);
    }

    private User createUser(String email, String username, CheckoutOrderRequestDto request, List<String> roles) {
        String[] names = splitName(request.getFullName());
        User user = new User();
        user.setEmail(email);
        user.setUsername(toUsernameCandidate(username, email, request.getFullName()));
        user.setFirstName(names[0]);
        user.setLastName(names[1]);
        user.setCompanyName(request.getCompany());
        user.setRegistrationDate(LocalDate.now());
        user.setRole(resolveRole(roles));
        return userRepository.save(user);
    }

    private Role resolveRole(List<String> roles) {
        return roles.stream().anyMatch(role -> "admin".equalsIgnoreCase(role))
                ? Role.ADMIN
                : Role.USER;
    }

    private String[] splitName(String fullName) {
        String normalized = fullName == null ? "" : fullName.trim();
        if (normalized.isEmpty()) {
            return new String[]{"User", ""};
        }
        String[] parts = normalized.split("\\s+", 2);
        return new String[]{parts[0], parts.length > 1 ? parts[1] : ""};
    }

    private Adress buildAddress(CheckoutOrderRequestDto request) {
        return Adress.builder()
                .street(joinAddressLines(request.getAddressLine1(), request.getAddressLine2()))
                .city(request.getCity())
                .state(request.getState())
                .zipcode(request.getPostalCode())
                .country("Unknown")
                .countryCode("N/A")
                .build();
    }

    private String joinAddressLines(String line1, String line2) {
        if (line2 == null || line2.isBlank()) {
            return line1;
        }
        return line1 + ", " + line2;
    }
}
