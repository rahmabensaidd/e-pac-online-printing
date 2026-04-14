package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.*;
import tn.epac.eprinting.model.entities.*;
import tn.epac.eprinting.model.enums.*;
import tn.epac.eprinting.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

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

    // ==================== Méthodes existantes (non modifiées) ====================
    private String generateInvoiceNumber() {
        String year = String.valueOf(LocalDate.now().getYear());
        long count = orderRepository.count() + 1;
        return String.format("INV-%s-%05d", year, count);
    }
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public OrderResponseDto checkout(Long cartId, CheckoutOrderRequestDto request, String email, String username, List<String> roles) {
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
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(generateInvoiceNumber());
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));

        float totalTTC = cart.getCalculatedTotal().floatValue();
        float tvaRate = 0.19f; // ou 0.0f si tu ne veux pas encore gérer la TVA
        float totalHT = totalTTC / (1 + tvaRate);
        float tvaAmount = totalTTC - totalHT;

        invoice.setTotalTTC(totalTTC);
        invoice.setTotalHT(totalHT);
        invoice.setTvaRate(tvaRate);
        invoice.setTvaAmount(tvaAmount);
        invoice.setPaid(false);
        invoice.setPaymentDate(null);

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
        order.setInvoice(invoice);
        invoice.setOrder(order);
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

    public Page<AdminOrderResponseDto> getAllOrdersAdmin(Pageable pageable, String status, String search) {
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
        Order order = orderRepository.findByIdWithLines(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        return mapToAdminResponseDto(order);
    }

    public AdminOrderResponseDto createOrder(OrderUpdateRequestDto request) {
        Order order = new Order();
        order.setOrderDate(LocalDate.now());
        order.setReference(generateOrderReference());
        order.setStatus(request.getStatus() != null ? request.getStatus() : OrderStatus.PENDING);
        order.setPriority(parseOrderPriority(request.getPriority()));
        order.setValidationStatus(OrderValidationStatus.PENDING);
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

    // ==================== NOUVELLE MÉTHODE : Update statut global de la commande ====================

    @Transactional
    public AdminOrderResponseDto updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        // Vérifier que le statut est autorisé (REJECTED, CANCELLED, SHIPPED)
        if (!isAllowedManualOrderStatus(newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le statut de la commande ne peut être modifié qu'en REJECTED, CANCELLED ou SHIPPED"
            );
        }

        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);
        return mapToAdminResponseDto(savedOrder);
    }

    // ==================== NOUVELLE MÉTHODE : Update batch des OrderLines ====================

    @Transactional
    public AdminOrderResponseDto updateOrderLines(Long orderId, List<OrderLineUpdateDto> updates) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        for (OrderLineUpdateDto update : updates) {
            OrderLine targetLine = order.getOrderLines().stream()
                    .filter(line -> Objects.equals(line.getOrderLineId(), update.getOrderLineId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("OrderLine not found with id: " + update.getOrderLineId()));

            // Seules les lignes CUSTOM peuvent être modifiées
            if (!targetLine.isCustomItem()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Seules les lignes de livres customisés peuvent être modifiées. LineId: " + update.getOrderLineId()
                );
            }

            // Mise à jour du statut
            if (update.getStatus() != null) {
                if (!isAllowedLineStatus(update.getStatus())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Statut non autorisé pour une ligne custom. Autorised: READY, REJECTED, PRINTING, READY_TO_SHIP"
                    );
                }
                targetLine.setLineStatus(update.getStatus());

                // Synchronisation du validationStatus avec le lineStatus
                if (update.getStatus() == OrderLineStatus.REJECTED) {
                    targetLine.setValidationStatus(OrderValidationStatus.REJECTED);
                } else if (update.getStatus() == OrderLineStatus.READY) {
                    targetLine.setValidationStatus(OrderValidationStatus.VALIDATED);
                }
            }

            // Mise à jour de la priorité (mapping LOW/MEDIUM/HIGH -> NORMAL/HIGH1/HIGH3)
            if (update.getPriority() != null && !update.getPriority().isBlank()) {
                OrderPriority mappedPriority = orderComputationService.fromDisplayPriority(update.getPriority());
                targetLine.setPriority(mappedPriority);
            }
        }

        // Recalculer tous les agrégats de la commande
        recomputeAggregates(order);

        Order savedOrder = orderRepository.save(order);
        return mapToAdminResponseDto(savedOrder);
    }

    // ==================== MÉTHODES EXISTANTES MODIFIÉES ====================

    /**
     * Met à jour le validationStatus d'une OrderLine (PENDING, VALIDATED, REJECTED)
     * @deprecated Utiliser updateOrderLines à la place pour une gestion unifiée
     */
    @Deprecated
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

        // Si validationStatus passe à VALIDATED, on met lineStatus à READY par défaut
        if (validationStatus == OrderValidationStatus.VALIDATED && targetLine.getLineStatus() == null) {
            targetLine.setLineStatus(OrderLineStatus.READY);
        }
        // Si validationStatus passe à REJECTED, on met lineStatus à REJECTED
        if (validationStatus == OrderValidationStatus.REJECTED) {
            targetLine.setLineStatus(OrderLineStatus.REJECTED);
        }

        recomputeAggregates(order);
        Order saved = orderRepository.save(order);
        return mapToAdminResponseDto(saved);
    }

    /**
     * Met à jour le lineStatus d'une OrderLine (PRINTING, READY_TO_SHIP)
     * @deprecated Utiliser updateOrderLines à la place pour une gestion unifiée
     */
    @Deprecated
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

        OrderLineStatus nextStatus = lineStatus == null ? OrderLineStatus.PRINTING : lineStatus;
        if (!isAllowedLineStatus(nextStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Custom line status can only be READY, REJECTED, PRINTING or READY_TO_SHIP"
            );
        }

        targetLine.setLineStatus(nextStatus);

        // Synchronisation du validationStatus
        if (nextStatus == OrderLineStatus.REJECTED) {
            targetLine.setValidationStatus(OrderValidationStatus.REJECTED);
        } else if (nextStatus == OrderLineStatus.READY) {
            targetLine.setValidationStatus(OrderValidationStatus.VALIDATED);
        }

        recomputeAggregates(order);
        Order saved = orderRepository.save(order);
        return mapToAdminResponseDto(saved);
    }

    // ==================== MÉTHODES ADMIN STANDARD ====================

    public AdminOrderResponseDto updateOrder(Long orderId, OrderUpdateRequestDto request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (request.getStatus() != null) {
            if (!isAllowedManualOrderStatus(request.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Order status can only be updated to SHIPPED, REJECTED, or CANCELLED"
                );
            }
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
        long printingOrders = orderRepository.countByStatus(OrderStatus.IN_PRODUCTION);
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

    // ==================== MÉTHODES PRIVÉES ====================

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
        if (value == null || value.isBlank()) {
            return OrderPriority.NORMAL;
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "LOW", "NORMAL" -> OrderPriority.NORMAL;
            case "MEDIUM", "HIGH1" -> OrderPriority.HIGH1;
            case "HIGH2" -> OrderPriority.HIGH2;
            case "HIGH", "HIGH3" -> OrderPriority.HIGH3;
            default -> OrderPriority.NORMAL;
        };
    }

    private String toPriorityLabel(OrderPriority priority) {
        OrderPriority normalized = orderComputationService.normalizePriority(priority);
        if (normalized == OrderPriority.HIGH3) return "High";
        if (normalized == OrderPriority.HIGH2 || normalized == OrderPriority.HIGH1) return "Medium";
        return "Low";
    }

    private boolean isAllowedManualOrderStatus(OrderStatus status) {
        return status == OrderStatus.SHIPPED
                || status == OrderStatus.REJECTED
                || status == OrderStatus.CANCELLED;
    }

    private boolean isAllowedLineStatus(OrderLineStatus status) {
        return status == OrderLineStatus.READY
                || status == OrderLineStatus.REJECTED
                || status == OrderLineStatus.PRINTING
                || status == OrderLineStatus.READY_TO_SHIP;
    }

    private void recomputeAggregates(Order order) {
        if (order.getOrderLines() == null) {
            order.setOrderLines(new ArrayList<>());
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
                .priority(line.getPriority() != null ? getDisplayPriorityForDto(line.getPriority()) : OrderPriority.NORMAL.name())
                .validationStatus(line.getValidationStatus() != null ? line.getValidationStatus().name() : OrderValidationStatus.PENDING.name())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice() != null ? line.getUnitPrice().floatValue() : 0f)
                .totalPrice(line.getTotalPrice() != null ? line.getTotalPrice().floatValue() : 0f)
                .isEstimated(Boolean.TRUE.equals(line.getIsEstimated()))
                .currency(line.getCurrency())
                .build();
    }

    private String getDisplayPriorityForDto(OrderPriority priority) {
        if (priority == null) return OrderPriority.NORMAL.name();
        // Pour l'affichage dans le DTO, on garde la valeur réelle
        return priority.name();
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

    @Transactional
    public void markPaidFromStripe(String paymentIntentId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getBilling() != null) {
            order.getBilling().setPaymentStatus(PaymentStatus.PAID);
            order.getBilling().setBillingDate(LocalDate.now());
        }

        if (order.getInvoice() != null) {
            order.getInvoice().setPaid(true);
            order.getInvoice().setPaymentDate(LocalDate.now());
        }

        orderRepository.save(order);
    }
    @Transactional
    public void markPaymentFailed(String paymentIntentId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getBilling() != null) {
            order.getBilling().setPaymentStatus(PaymentStatus.FAILED);
        }

        if (order.getInvoice() != null) {
            order.getInvoice().setPaid(false);
            order.getInvoice().setPaymentDate(null);
        }

        orderRepository.save(order);
    }
}
