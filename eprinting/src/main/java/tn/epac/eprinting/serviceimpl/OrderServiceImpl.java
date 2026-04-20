package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class OrderServiceImpl {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final AdressRepository adressRepository;
    private final BillingRepository billingRepository;
    private final ShippingRepository shippingRepository;
    private final CustomBookPricingService customBookPricingService;
    private final OrderComputationService orderComputationService;
    private final InvoicePdfServiceImpl invoicePdfService;
    private final ShippoShippingService shippoShippingService;

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

        ShippingMethod shippingMethod = parseShippingMethod(request.getShippingMethod());
        validateCheckoutAddress(request, shippingMethod);

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
        shipping.setRecipientFullName(trimToNull(request.getFullName()));
        shipping.setRecipientEmail(trimToNull(request.getEmail()));
        shipping.setRecipientPhone(trimToNull(request.getPhone()));
        shipping.setRecipientCompany(trimToNull(request.getCompany()));
        shipping.setShippingMethod(shippingMethod);
        shipping.setCarrier(resolveCarrier(shippingMethod));
        shipping.setCarrierServiceCode(resolveCarrierServiceCode(shippingMethod));
        shipping.setShippingStatus(ShippingStatus.PENDING);
        shipping.setEstimatedDelivery(resolveEstimatedDelivery(shippingMethod));
        shipping.setShippingCost(resolveShippingCost(shippingMethod));
        shipping = shippingRepository.save(shipping);

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(generateInvoiceNumber());
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));

        float totalTTC = cart.getCalculatedTotal().floatValue();
        float tvaRate = 0.19f;
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
        shippoShippingService.triggerTrackingIfEligible(order);

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

    public OrderTrackingResponseDto refreshTrackingForCurrentUser(Long orderId, String email, String username) {
        User user = resolveCurrentUser(email, username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Order order = orderRepository.findByIdWithLines(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getUser() == null || !Objects.equals(order.getUser().getUserId(), user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this order");
        }

        shippoShippingService.refreshTrackingForOrder(order);
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

    public AdminShippingRatesResponseDto getShippingRatesForAdmin(Long orderId) {
        Order order = orderRepository.findByIdWithLines(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        Shipping shipping = order.getShipping();
        if (shipping == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shipping not initialized for this order");
        }

        boolean testMode = shippoShippingService.isTestModeEnabled();
        boolean ratesEnabled = shippoShippingService.areRatesEnabled();
        String infoMessage = shippoShippingService.describeShippingModeForAdmin();

        List<ShippingRateDto> rates = ratesEnabled
                ? shippoShippingService.fetchRatesForOrder(order)
                : List.of();
        return AdminShippingRatesResponseDto.builder()
                .orderId(order.getOrderId())
                .shippingMethod(shipping.getShippingMethod() != null ? shipping.getShippingMethod().name() : null)
                .selectedRateId(shipping.getSelectedRateId())
                .selectedService(shipping.getSelectedRateService())
                .testMode(testMode)
                .ratesEnabled(ratesEnabled)
                .informationMessage(infoMessage)
                .rates(rates)
                .build();
    }

    public AdminShipmentActionResponseDto selectShippingRateForAdmin(
            Long orderId,
            String rateId,
            String carrier,
            String service,
            String currency,
            Float amount
    ) {
        Order order = orderRepository.findByIdWithLines(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        return shippoShippingService.selectRateForOrder(order, rateId, carrier, service, currency, amount);
    }

    public AdminShipmentActionResponseDto createShipmentForAdmin(
            Long orderId,
            String rateId,
            String carrier,
            String service,
            String currency,
            Float amount,
            boolean autoSelect,
            boolean testShipment
    ) {
        Order order = orderRepository.findByIdWithLines(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        return shippoShippingService.createShipmentForOrder(order, rateId, carrier, service, currency, amount, autoSelect, testShipment);
    }

    public AdminShipmentActionResponseDto refreshShipmentTrackingForAdmin(Long orderId) {
        Order order = orderRepository.findByIdWithLines(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        return shippoShippingService.refreshTrackingForOrder(order);
    }

    public List<ShippingOptionDto> getShippingOptions(float subtotal, boolean organizationUser) {
        List<ShippingOptionDto> options = new ArrayList<>();
        if (organizationUser) {
            options.add(ShippingOptionDto.builder()
                    .code("freight_shipping")
                    .label("Freight shipping")
                    .price(subtotal >= 150 ? 0f : 8.5f)
                    .currency("USD")
                    .build());
            options.add(ShippingOptionDto.builder()
                    .code("full_truckload")
                    .label("Full truckload")
                    .price(0f)
                    .currency("USD")
                    .build());
            return options;
        }

        options.add(ShippingOptionDto.builder()
                .code("standard")
                .label("Standard")
                .price(subtotal >= 150 ? 0f : 8.5f)
                .currency("USD")
                .build());
        return options;
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
        billing.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CARD");
        billing.setPaymentStatus(request.getPaymentStatus() != null ? request.getPaymentStatus() : PaymentStatus.PENDING);
        billing.setBillingDate(LocalDate.now());
        billing = billingRepository.save(billing);
        order.setBilling(billing);

        ShippingMethod shippingMethod = parseShippingMethod(request.getShippingMethod());

        Shipping shipping = new Shipping();
        shipping.setShippingMethod(shippingMethod);
        shipping.setCarrier(resolveCarrier(shippingMethod));
        shipping.setCarrierServiceCode(resolveCarrierServiceCode(shippingMethod));
        shipping.setShippingStatus(ShippingStatus.PENDING);
        shipping.setEstimatedDelivery(resolveEstimatedDelivery(shippingMethod));
        shipping.setShippingCost(resolveShippingCost(shippingMethod));
        shipping = shippingRepository.save(shipping);
        order.setShipping(shipping);

        Order savedOrder = orderRepository.save(order);
        return mapToAdminResponseDto(savedOrder);
    }

    @Transactional
    public AdminOrderResponseDto updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

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

    @Transactional
    public AdminOrderResponseDto updateOrderLines(Long orderId, List<OrderLineUpdateDto> updates) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        for (OrderLineUpdateDto update : updates) {
            OrderLine targetLine = order.getOrderLines().stream()
                    .filter(line -> Objects.equals(line.getOrderLineId(), update.getOrderLineId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("OrderLine not found with id: " + update.getOrderLineId()));

            if (update.getStatus() != null && !update.getStatus().isBlank()) {
                applyOrderLineStatusUpdate(targetLine, update.getStatus(), update.getOrderLineId());
            }

            if (update.getPriority() != null && !update.getPriority().isBlank() && targetLine.isCustomItem()) {
                OrderPriority mappedPriority = orderComputationService.fromDisplayPriority(update.getPriority());
                targetLine.setPriority(mappedPriority);
            }
        }

        recomputeAggregates(order);
        shippoShippingService.triggerTrackingIfEligible(order);

        Order savedOrder = orderRepository.save(order);
        return mapToAdminResponseDto(savedOrder);
    }

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

        if (validationStatus == OrderValidationStatus.VALIDATED && targetLine.getLineStatus() == null) {
            targetLine.setLineStatus(OrderLineStatus.READY);
        }
        if (validationStatus == OrderValidationStatus.REJECTED) {
            targetLine.setLineStatus(OrderLineStatus.REJECTED);
        }

        recomputeAggregates(order);
        shippoShippingService.triggerTrackingIfEligible(order);
        Order saved = orderRepository.save(order);
        return mapToAdminResponseDto(saved);
    }

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

        if (nextStatus == OrderLineStatus.REJECTED) {
            targetLine.setValidationStatus(OrderValidationStatus.REJECTED);
        } else if (nextStatus == OrderLineStatus.READY) {
            targetLine.setValidationStatus(OrderValidationStatus.VALIDATED);
        }

        recomputeAggregates(order);
        shippoShippingService.triggerTrackingIfEligible(order);
        Order saved = orderRepository.save(order);
        return mapToAdminResponseDto(saved);
    }

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

        if (request.getShippingMethod() != null && order.getShipping() != null) {
            ShippingMethod shippingMethod = parseShippingMethod(request.getShippingMethod());
            order.getShipping().setShippingMethod(shippingMethod);
            order.getShipping().setCarrier(resolveCarrier(shippingMethod));
            order.getShipping().setCarrierServiceCode(resolveCarrierServiceCode(shippingMethod));
            order.getShipping().setEstimatedDelivery(resolveEstimatedDelivery(shippingMethod));
            order.getShipping().setShippingCost(resolveShippingCost(shippingMethod));
        }

        if (order.getOrderLines() != null && !order.getOrderLines().isEmpty()) {
            recomputeAggregates(order);
        }
        shippoShippingService.triggerTrackingIfEligible(order);

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
                .shippingMethod(order.getShipping() != null && order.getShipping().getShippingMethod() != null
                        ? order.getShipping().getShippingMethod().name()
                        : null)
                .shippingStatus(order.getShipping() != null && order.getShipping().getShippingStatus() != null
                        ? order.getShipping().getShippingStatus().name()
                        : null)
                .trackingNumber(order.getShipping() != null ? order.getShipping().getTrackingNumber() : null)
                .trackingUrl(order.getShipping() != null ? order.getShipping().getTrackingUrl() : null)
                .carrier(order.getShipping() != null ? order.getShipping().getCarrier() : null)
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
                .shippingMethod(String.valueOf(order.getShipping() != null ? order.getShipping().getShippingMethod() : ShippingMethod.STANDARD))
                .shippingStatus(order.getShipping() != null && order.getShipping().getShippingStatus() != null
                        ? order.getShipping().getShippingStatus().name()
                        : null)
                .trackingNumber(order.getShipping() != null ? order.getShipping().getTrackingNumber() : null)
                .trackingUrl(order.getShipping() != null ? order.getShipping().getTrackingUrl() : null)
                .carrier(order.getShipping() != null ? order.getShipping().getCarrier() : null)
                .labelUrl(order.getShipping() != null ? order.getShipping().getLabelUrl() : null)
                .selectedRateId(order.getShipping() != null ? order.getShipping().getSelectedRateId() : null)
                .selectedRateService(order.getShipping() != null ? order.getShipping().getSelectedRateService() : null)
                .selectedRateCurrency(order.getShipping() != null ? order.getShipping().getSelectedRateCurrency() : null)
                .selectedRateAmount(order.getShipping() != null && order.getShipping().getSelectedRateAmount() != null
                        ? order.getShipping().getSelectedRateAmount().floatValue()
                        : null)
                .testShipment(order.getShipping() != null && order.getShipping().isTestShipment())
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
                .shippingMethod(order.getShipping() != null && order.getShipping().getShippingMethod() != null
                        ? order.getShipping().getShippingMethod().name()
                        : null)
                .shippingStatus(order.getShipping() != null && order.getShipping().getShippingStatus() != null
                        ? order.getShipping().getShippingStatus().name()
                        : null)
                .carrier(order.getShipping() != null ? order.getShipping().getCarrier() : null)
                .trackingNumber(order.getShipping() != null ? order.getShipping().getTrackingNumber() : null)
                .trackingUrl(order.getShipping() != null ? order.getShipping().getTrackingUrl() : null)
                .testShipment(order.getShipping() != null && order.getShipping().isTestShipment())
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

    private ShippingMethod parseShippingMethod(String value) {
        if (value == null || value.isBlank()) {
            return ShippingMethod.STANDARD;
        }

        String normalized = value.trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        return switch (normalized) {
            case "FREIGHTSHIPPING", "FREIGHT_SHIPPING" -> ShippingMethod.FREIGHTSHIPPING;
            case "FULLTRUCKLOAD_DHL", "FULLTRUCKLOAD", "FULL_TRACKLOAD", "FULLTRACKLOAD", "FULL_TRUCKLOAD" ->
                    ShippingMethod.FULLTRUCKLOAD_DHL;
            case "STANDARD" -> ShippingMethod.STANDARD;
            default -> ShippingMethod.STANDARD;
        };
    }

    private float resolveShippingCost(ShippingMethod shippingMethod) {
        return switch (shippingMethod) {
            case FREIGHTSHIPPING -> 18f;
            case FULLTRUCKLOAD_DHL -> 25f;
            case STANDARD -> 8.5f;
        };
    }

    private LocalDate resolveEstimatedDelivery(ShippingMethod shippingMethod) {
        return switch (shippingMethod) {
            case FREIGHTSHIPPING -> LocalDate.now().plusDays(3);
            case FULLTRUCKLOAD_DHL -> LocalDate.now().plusDays(2);
            case STANDARD -> LocalDate.now().plusDays(5);
        };
    }

    private String resolveCarrier(ShippingMethod shippingMethod) {
        return switch (shippingMethod) {
            case FREIGHTSHIPPING, FULLTRUCKLOAD_DHL -> "DHL";
            case STANDARD -> "STANDARD";
        };
    }

    private String resolveCarrierServiceCode(ShippingMethod shippingMethod) {
        return switch (shippingMethod) {
            case FREIGHTSHIPPING -> "DHL_FREIGHT";
            case FULLTRUCKLOAD_DHL -> "DHL_FTL";
            case STANDARD -> "STANDARD";
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

    private void applyOrderLineStatusUpdate(OrderLine line, String requestedStatus, Long lineId) {
        String normalized = requestedStatus.trim().toUpperCase(Locale.ROOT);

        if (line.isCustomItem()) {
            applyCustomLineStatus(line, normalized, lineId);
            return;
        }

        applyMarketplaceLineStatus(line, normalized, lineId);
    }

    private void applyCustomLineStatus(OrderLine line, String status, Long lineId) {
        switch (status) {
            case "PENDING" -> {
                line.setValidationStatus(OrderValidationStatus.PENDING);
                line.setLineStatus(OrderLineStatus.READY);
            }
            case "PRINTING" -> {
                line.setValidationStatus(OrderValidationStatus.VALIDATED);
                line.setLineStatus(OrderLineStatus.PRINTING);
            }
            case "READY_TO_SHIP" -> {
                line.setValidationStatus(OrderValidationStatus.VALIDATED);
                line.setLineStatus(OrderLineStatus.READY_TO_SHIP);
            }
            case "VALIDATED", "READY" -> {
                line.setValidationStatus(OrderValidationStatus.VALIDATED);
                line.setLineStatus(OrderLineStatus.READY);
            }
            case "REJECTED" -> {
                line.setValidationStatus(OrderValidationStatus.REJECTED);
                line.setLineStatus(OrderLineStatus.REJECTED);
            }
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid custom line status. Allowed: PENDING, PRINTING, READY_TO_SHIP, VALIDATED, REJECTED. LineId: " + lineId
            );
        }
    }

    private void applyMarketplaceLineStatus(OrderLine line, String status, Long lineId) {
        switch (status) {
            case "READY" -> {
                line.setLineStatus(OrderLineStatus.READY);
                line.setValidationStatus(OrderValidationStatus.VALIDATED);
            }
            case "READY_TO_SHIP" -> {
                line.setLineStatus(OrderLineStatus.READY_TO_SHIP);
                line.setValidationStatus(OrderValidationStatus.VALIDATED);
            }
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Marketplace line status can only be READY or READY_TO_SHIP. LineId: " + lineId
            );
        }
    }

    private String resolveDisplayLineStatus(OrderLine line) {
        if (line == null) {
            return "READY";
        }

        if (line.isCustomItem()) {
            if (line.getValidationStatus() == OrderValidationStatus.REJECTED || line.getLineStatus() == OrderLineStatus.REJECTED) {
                return "REJECTED";
            }
            if (line.getValidationStatus() == OrderValidationStatus.PENDING
                    || (line.getValidationStatus() == null
                    && (line.getLineStatus() == null || line.getLineStatus() == OrderLineStatus.READY))) {
                return "PENDING";
            }
            if (line.getLineStatus() == OrderLineStatus.PRINTING) {
                return "PRINTING";
            }
            if (line.getLineStatus() == OrderLineStatus.READY_TO_SHIP) {
                return "READY_TO_SHIP";
            }
            return "VALIDATED";
        }

        if (line.getLineStatus() == null) {
            return "READY";
        }
        return line.getLineStatus().name();
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
                .lineStatus(resolveDisplayLineStatus(line))
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
        user.setPhoneNumber(trimToNull(request.getPhone()));
        if (request.getCompany() != null && !request.getCompany().isBlank()) {
            user.setCompanyName(request.getCompany());
        }
        user.setAddressLine1(trimToNull(request.getAddressLine1()));
        user.setAddressLine2(trimToNull(request.getAddressLine2()));
        user.setCity(trimToNull(request.getCity()));
        user.setState(trimToNull(request.getState()));
        user.setPostalCode(trimToNull(request.getPostalCode()));
        user.setCountry(normalizeCountryName(request.getCountry()));
        user.setCountryCode(normalizeCountryCode(request.getCountry()));
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
        user.setPhoneNumber(trimToNull(request.getPhone()));
        user.setAddressLine1(trimToNull(request.getAddressLine1()));
        user.setAddressLine2(trimToNull(request.getAddressLine2()));
        user.setCity(trimToNull(request.getCity()));
        user.setState(trimToNull(request.getState()));
        user.setPostalCode(trimToNull(request.getPostalCode()));
        user.setCountry(normalizeCountryName(request.getCountry()));
        user.setCountryCode(normalizeCountryCode(request.getCountry()));
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
        String street = joinAddressLines(request.getAddressLine1(), request.getAddressLine2());
        String city = trimToNull(request.getCity());
        String state = trimToNull(request.getState());
        String zip = trimToNull(request.getPostalCode());
        String country = normalizeCountryName(request.getCountry());
        String countryCode = normalizeCountryCode(request.getCountry());
        log.info(
                "Checkout address mapped -> street='{}', city='{}', state='{}', postalCode='{}', country='{}', countryCode='{}'",
                street,
                city,
                state,
                zip,
                country,
                countryCode
        );
        return Adress.builder()
                .street(street)
                .city(city)
                .state(state)
                .zipcode(zip)
                .country(country)
                .countryCode(countryCode)
                .build();
    }

    private String joinAddressLines(String line1, String line2) {
        if (line2 == null || line2.isBlank()) {
            return line1;
        }
        return line1 + ", " + line2;
    }

    private void validateCheckoutAddress(CheckoutOrderRequestDto request, ShippingMethod shippingMethod) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Checkout payload is missing");
        }
        if (shippingMethod == ShippingMethod.FULLTRUCKLOAD_DHL) {
            return;
        }

        List<String> missingFields = new ArrayList<>();
        if (trimToNull(request.getAddressLine1()) == null) {
            missingFields.add("addressLine1");
        }
        if (trimToNull(request.getCity()) == null) {
            missingFields.add("city");
        }
        if (trimToNull(request.getState()) == null) {
            missingFields.add("state");
        }
        if (trimToNull(request.getPostalCode()) == null) {
            missingFields.add("postalCode");
        }
        if (trimToNull(request.getCountry()) == null) {
            missingFields.add("country");
        }
        if (trimToNull(request.getPhone()) == null) {
            missingFields.add("phone");
        }

        if (!missingFields.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Missing shipping address fields: " + String.join(", ", missingFields)
            );
        }
    }

    private String normalizeCountryName(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return "France";
        }

        return switch (normalized.trim().toUpperCase(Locale.ROOT)) {
            case "FR", "FRA", "FRANCE" -> "France";
            case "TN", "TUN", "TUNISIA", "TUNISIE" -> "Tunisia";
            case "US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA", "ETATS-UNIS", "ÉTATS-UNIS" -> "United States";
            case "GB", "UK", "UNITED KINGDOM", "ROYAUME-UNI" -> "United Kingdom";
            case "DE", "GERMANY", "ALLEMAGNE" -> "Germany";
            case "IT", "ITALY", "ITALIE" -> "Italy";
            case "ES", "SPAIN", "ESPAGNE" -> "Spain";
            case "BE", "BELGIUM", "BELGIQUE" -> "Belgium";
            case "NL", "NETHERLANDS", "PAYS-BAS" -> "Netherlands";
            case "PT", "PORTUGAL" -> "Portugal";
            case "CH", "SWITZERLAND", "SUISSE" -> "Switzerland";
            case "CA", "CANADA" -> "Canada";
            default -> normalized;
        };
    }

    private String normalizeCountryCode(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return "FR";
        }

        return switch (normalized.trim().toUpperCase(Locale.ROOT)) {
            case "FR", "FRA", "FRANCE" -> "FR";
            case "TN", "TUN", "TUNISIA", "TUNISIE" -> "TN";
            case "US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA", "ETATS-UNIS", "ÉTATS-UNIS" -> "US";
            case "GB", "UK", "UNITED KINGDOM", "ROYAUME-UNI" -> "GB";
            case "DE", "GERMANY", "ALLEMAGNE" -> "DE";
            case "IT", "ITALY", "ITALIE" -> "IT";
            case "ES", "SPAIN", "ESPAGNE" -> "ES";
            case "BE", "BELGIUM", "BELGIQUE" -> "BE";
            case "NL", "NETHERLANDS", "PAYS-BAS" -> "NL";
            case "PT", "PORTUGAL" -> "PT";
            case "CH", "SWITZERLAND", "SUISSE" -> "CH";
            case "CA", "CANADA" -> "CA";
            default -> normalized.trim().toUpperCase(Locale.ROOT);
        };
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional
    public void markPaidFromStripe(String paymentIntentId, Long orderId) {
        System.out.println("✅ markPaidFromStripe called for orderId = " + orderId);

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

        try {
            System.out.println("✅ Generating invoice PDF for orderId = " + orderId);
            invoicePdfService.generateAndStoreInvoicePdf(orderId);
        } catch (Exception e) {
            System.out.println("❌ Invoice PDF generation failed for order " + orderId + ": " + e.getMessage());
            e.printStackTrace();
        }
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
