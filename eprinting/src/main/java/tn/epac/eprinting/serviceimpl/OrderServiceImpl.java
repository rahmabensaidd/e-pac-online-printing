package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.*;
import tn.epac.eprinting.model.entities.Adress;
import tn.epac.eprinting.model.entities.Billing;
import tn.epac.eprinting.model.entities.Cart;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.model.entities.Shipping;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.CartItemSource;
import tn.epac.eprinting.model.enums.OrderPriority;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.PaymentStatus;
import tn.epac.eprinting.model.enums.PriorityLevel;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.model.enums.ShippingStatus;
import tn.epac.eprinting.repository.AdressRepository;
import tn.epac.eprinting.repository.BillingRepository;
import tn.epac.eprinting.repository.CartRepository;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.repository.ShippingRepository;
import tn.epac.eprinting.repository.UserRepository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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

        Order order = new Order();
        order.setOrderDate(LocalDate.now());
        order.setStatus(OrderStatus.PENDING);
        order.setUser(user);
        order.setBilling(billing);
        order.setShipping(shipping);
        order.setTotalAmount(cart.getCalculatedTotal().floatValue());
        order.setReference(generateOrderReference());
        order.setPriority(calculateOrderPriorityFromCartLines(cart.getItems()));

        List<OrderLine> orderLines = cart.getItems().stream()
                .map(this::copyOrderLine)
                .toList();
        order.setOrderLines(orderLines);

        Order savedOrder = orderRepository.save(order);
        cartRepository.delete(cart);

        return OrderResponseDto.builder()
                .orderId(savedOrder.getOrderId())
                .orderDate(savedOrder.getOrderDate())
                .status(savedOrder.getStatus())
                .totalAmount(savedOrder.getTotalAmount())
                .customerEmail(user.getEmail())
                .items(savedOrder.getOrderLines().stream().map(this::mapOrderLine).toList())
                .build();
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
                .build();
    }

    private OrderLineResponseDto mapOrderLine(OrderLine line) {
        return OrderLineResponseDto.builder()
                .orderLineId(line.getOrderLineId())
                .bookId(line.getBook() != null ? line.getBook().getBookId() : null)
                .title(line.getBook() != null ? line.getBook().getTitle() : null)
                .itemSource(line.getItemSource() != null ? line.getItemSource().name() : CartItemSource.MARKETPLACE.name())
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
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Final price updated, please confirm"
                );
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

    /**
     * Get all orders for admin with pagination and filtering
     */
    public Page<AdminOrderResponseDto> getAllOrdersAdmin(
            Pageable pageable,
            String status,
            String search
    ) {
        Page<Order> orders;

        if (status != null && !status.isEmpty()) {
            try {
                OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
                orders = orderRepository.findByStatus(orderStatus, pageable);
            } catch (IllegalArgumentException e) {
                orders = Page.empty(pageable);
            }
        } else if (search != null && !search.isEmpty()) {
            orders = orderRepository.searchOrders(search, pageable);
        } else {
            orders = orderRepository.findAll(pageable);
        }

        return orders.map(this::mapToAdminResponseDto);
    }

    /**
     * Get order by ID for admin
     */
    public AdminOrderResponseDto getOrderByIdForAdmin(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        return mapToAdminResponseDto(order);
    }

    /**
     * Create new order (admin manual creation)
     */
    public AdminOrderResponseDto createOrder(OrderUpdateRequestDto request) {
        Order order = new Order();
        order.setOrderDate(LocalDate.now());
        order.setStatus(request.getStatus() != null ? request.getStatus() : OrderStatus.PENDING);
        order.setTotalAmount(request.getTotal() != null ? request.getTotal().floatValue() : 0f);
        order.setReference(generateOrderReference());
        order.setPriority(parseOrderPriority(request.getPriority()));

        User assigneeUser = resolveAssigneeUser(request.getAssignee(), request.getCompanyName());
        order.setUser(assigneeUser);

        // Créer un billing par défaut
        Billing billing = new Billing();
        billing.setPaymentMethod(request.getShippingMethod() != null ? request.getShippingMethod() : "Standard");
        billing.setPaymentStatus(request.getPaymentStatus() != null ? request.getPaymentStatus() : PaymentStatus.PENDING);
        billing.setBillingDate(LocalDate.now());
        billing = billingRepository.save(billing);
        order.setBilling(billing);

        // Créer un shipping par défaut
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

    /**
     * Update existing order
     */
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

        Order updatedOrder = orderRepository.save(order);
        return mapToAdminResponseDto(updatedOrder);
    }

    /**
     * Delete order
     */
    public void deleteOrder(Long orderId) {
        if (!orderRepository.existsById(orderId)) {
            throw new ResourceNotFoundException("Order not found with id: " + orderId);
        }
        orderRepository.deleteById(orderId);
    }

    /**
     * Get order statistics for dashboard
     */
    public OrderStatsDto getOrderStats() {
        long totalOrders = orderRepository.count();
        long pendingOrders = orderRepository.countByStatus(OrderStatus.PENDING);
        long processingOrders = orderRepository.countByStatus(OrderStatus.PROCESSING);
        long shippedOrders = orderRepository.countByStatus(OrderStatus.SHIPPED);
        long deliveredOrders = orderRepository.countByStatus(OrderStatus.DELIVERED);
        long cancelledOrders = orderRepository.countByStatus(OrderStatus.CANCELLED);

        // Valeur totale des commandes non livrées (PENDING, PROCESSING, SHIPPED)
        BigDecimal productionValue = orderRepository.sumTotalAmountByExcludedStatuses(
                OrderStatus.DELIVERED, OrderStatus.CANCELLED
        );
        if (productionValue == null) {
            productionValue = BigDecimal.ZERO;
        }

        return OrderStatsDto.builder()
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .processingOrders(processingOrders)
                .shippedOrders(shippedOrders)
                .deliveredOrders(deliveredOrders)
                .cancelledOrders(cancelledOrders)
                .productionValue(productionValue)
                .build();
    }

    /**
     * Generate unique order reference
     */
    private String generateOrderReference() {
        String year = String.valueOf(LocalDate.now().getYear()).substring(2);
        long count = orderRepository.count() + 1;
        return String.format("ORD-%s-%05d", year, count);
    }

    /**
     * Map Order entity to AdminOrderResponseDto
     */
    private AdminOrderResponseDto mapToAdminResponseDto(Order order) {
        return AdminOrderResponseDto.builder()
                .orderId(order.getOrderId())
                .reference(order.getReference() != null ? order.getReference() : generateOrderReference())
                .customerName(order.getUser() != null ?
                        (order.getUser().getFirstName() + " " + order.getUser().getLastName()).trim() : "Unknown")
                .companyName(order.getUser() != null && order.getUser().getCompanyName() != null ? order.getUser().getCompanyName() : "")
                .channel("Marketplace")
                .submittedAt(order.getOrderDate())
                .dueDate(order.getOrderDate() != null ? order.getOrderDate().plusDays(5) : LocalDate.now().plusDays(5))
                .total(order.getTotalAmount() != 0? BigDecimal.valueOf(order.getTotalAmount()) : BigDecimal.ZERO)
                .status(order.getStatus())
                .priority(toPriorityLabel(resolveOrderPriority(order)))
                .assignee(getAssigneeFromOrder(order))
                .items(order.getOrderLines() != null ? order.getOrderLines().size() : 0)
                .shippingMethod(order.getShipping() != null ? order.getShipping().getShippingMethod() : "Standard")
                .paymentStatus(order.getBilling() != null ? order.getBilling().getPaymentStatus() : PaymentStatus.PENDING)
                .notes("")
                .orderLines(order.getOrderLines() != null ?
                        order.getOrderLines().stream().map(this::mapOrderLine).toList() : List.of())
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
        String normalized = (username == null || username.isBlank()) ? "user" : username.trim().toLowerCase();
        return normalized.replace(' ', '.') + "@epac.local";
    }

    private OrderPriority resolveOrderPriority(Order order) {
        if (order.getPriority() != null) {
            return order.getPriority();
        }

        return calculateOrderPriorityFromOrderLines(order.getOrderLines());
    }

    private OrderPriority calculateOrderPriorityFromCartLines(List<OrderLine> lines) {
        return calculateOrderPriorityFromOrderLines(lines);
    }

    private OrderPriority calculateOrderPriorityFromOrderLines(List<OrderLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return OrderPriority.LOW;
        }

        boolean hasHigh3 = lines.stream().anyMatch(this::isHigh3Book);
        if (hasHigh3) {
            return OrderPriority.HIGH;
        }

        boolean hasHigh2 = lines.stream().anyMatch(this::isHigh2Book);
        if (hasHigh2) {
            return OrderPriority.MEDIUM;
        }

        return OrderPriority.LOW;
    }

    private boolean isHigh3Book(OrderLine line) {
        return line != null
                && line.getBook() != null
                && line.getBook().getPriorityLevel() == PriorityLevel.HIGH3;
    }

    private boolean isHigh2Book(OrderLine line) {
        return line != null
                && line.getBook() != null
                && line.getBook().getPriorityLevel() == PriorityLevel.HIGH2;
    }

    private OrderPriority parseOrderPriority(String value) {
        if (value == null || value.isBlank()) {
            return OrderPriority.LOW;
        }

        try {
            return OrderPriority.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            if ("normal".equalsIgnoreCase(value)) {
                return OrderPriority.MEDIUM;
            }
            return OrderPriority.LOW;
        }
    }

    private String toPriorityLabel(OrderPriority priority) {
        return switch (priority) {
            case HIGH -> "High";
            case MEDIUM -> "Medium";
            case LOW -> "Low";
        };
    }
}
