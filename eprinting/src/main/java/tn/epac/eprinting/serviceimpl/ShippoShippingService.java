package tn.epac.eprinting.serviceimpl;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.AdminShipmentActionResponseDto;
import tn.epac.eprinting.model.dtos.ShippingRateDto;
import tn.epac.eprinting.model.entities.Adress;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.model.entities.Shipping;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.ShippingMethod;
import tn.epac.eprinting.model.enums.ShippingStatus;
import tn.epac.eprinting.repository.OrderRepository;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShippoShippingService {

    private static final JsonParser JSON_PARSER = JsonParserFactory.getJsonParser();
    private final OrderRepository orderRepository;

    @Value("${shippo.api.base-url:https://api.goshippo.com}")
    private String shippoApiBaseUrl;

    @Value("${shippo.api.token:}")
    private String shippoApiToken;

    @Value("${shippo.webhook.secret:}")
    private String shippoWebhookSecret;

    @Value("${shippo.test-mode:true}")
    private boolean shippoTestMode;

    @Value("${shippo.real-carrier-configured:false}")
    private boolean shippoRealCarrierConfigured;

    @Value("${shippo.default.service:standard}")
    private String shippoDefaultService;

    @Value("${shippo.sender.full-name:EPAC Logistics}")
    private String senderFullName;

    @Value("${shippo.sender.company:EPAC}")
    private String senderCompany;

    @Value("${shippo.sender.country:FR}")
    private String senderCountry;

    @Value("${shippo.sender.zip:75001}")
    private String senderZip;

    @Value("${shippo.sender.city:Paris}")
    private String senderCity;

    @Value("${shippo.sender.state:}")
    private String senderState;

    @Value("${shippo.sender.address1:32 Rue de Rivoli}")
    private String senderAddress1;

    @Value("${shippo.sender.address2:}")
    private String senderAddress2;

    @Value("${shippo.sender.phone:0000000000}")
    private String senderPhone;

    @Value("${shippo.sender.email:no-reply@epac.local}")
    private String senderEmail;

    @PostConstruct
    void logConfig() {
        log.info(
                "Shippo config -> testMode={}, realCarrierConfigured={}, ratesEnabled={}, senderCountry={}, senderState={}",
                shippoTestMode,
                shippoRealCarrierConfigured,
                areRatesEnabled(),
                senderCountry,
                senderState
        );
        if (shippoTestMode) {
            log.warn("Shippo is running in TEST mode: generated labels are test labels and not valid for real shipment.");
        }
        if (requiresAdministrativeArea(senderCountry) && (senderState == null || senderState.isBlank())) {
            log.warn(
                    "Shippo sender address may be incomplete for country {} because shippo.sender.state is blank.",
                    senderCountry
            );
        }
    }

    public void triggerTrackingIfEligible(Order order) {
        // Manual shipping mode:
        // reaching READY_TO_SHIP must not auto-create a shipment.
        if (order != null && order.getStatus() == OrderStatus.READY_TO_SHIP) {
            log.info(
                    "Order {} is READY_TO_SHIP. Waiting for admin to select a rate and click ship.",
                    order.getOrderId()
            );
        }
    }

    public boolean isTestModeEnabled() {
        return shippoTestMode;
    }

    public boolean areRatesEnabled() {
        return shippoApiToken != null && !shippoApiToken.isBlank();
    }

    public String describeShippingModeForAdmin() {
        if (!shippoTestMode) {
            return "Mode production Shippo actif.";
        }
        return "Mode test Shippo actif: sélectionnez un rate puis expédiez.";
    }

    public List<ShippingRateDto> fetchRatesForOrder(Order order) {
        if (order == null || order.getShipping() == null || shippoApiToken == null || shippoApiToken.isBlank()) {
            return List.of();
        }
        if (!areRatesEnabled()) {
            return List.of();
        }

        try {
            Map<String, Object> shipmentPayload = buildShipmentPayload(order, order.getShipping());
            Map<String, Object> fromAddress = asMap(shipmentPayload.get("address_from"));
            Map<String, Object> toAddress = asMap(shipmentPayload.get("address_to"));
            Object parcels = shipmentPayload.get("parcels");

            log.info(
                    "Shippo rates request -> orderId={}, reference={}, shippingMethod={}, testMode={}, endpoint={}/shipments/, fromCountry={}, fromState={}, toCountry={}, toState={}, toZip={}, parcels={}",
                    order.getOrderId(),
                    order.getReference(),
                    order.getShipping() != null && order.getShipping().getShippingMethod() != null
                            ? order.getShipping().getShippingMethod().name()
                            : "N/A",
                    shippoTestMode,
                    trimTrailingSlash(shippoApiBaseUrl),
                    asString(fromAddress.get("country"), "N/A"),
                    asString(fromAddress.get("state"), "N/A"),
                    asString(toAddress.get("country"), "N/A"),
                    asString(toAddress.get("state"), "N/A"),
                    asString(toAddress.get("zip"), "N/A"),
                    compact(parcels)
            );

            Map<?, ?> shipmentResponse = WebClient.create(trimTrailingSlash(shippoApiBaseUrl))
                    .post()
                    .uri("/shipments/")
                    .header("Authorization", "ShippoToken " + shippoApiToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(shipmentPayload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            List<ShippingRateDto> rates = mapShippoRates(shipmentResponse, order.getShipping().getSelectedRateId());
            log.info(
                    "Shippo rates response -> orderId={}, shipmentObjectId={}, ratesCount={}",
                    order.getOrderId(),
                    shipmentResponse != null ? asString(shipmentResponse.get("object_id"), "N/A") : "N/A",
                    rates.size()
            );

            if (rates.isEmpty()) {
                String messages = shipmentResponse != null ? compact(shipmentResponse.get("messages")) : "null-response";
                log.warn(
                        "Shippo rates empty -> orderId={}, messages={}",
                        order.getOrderId(),
                        messages
                );
            }

            List<ShippingRateDto> supportedRates = filterSupportedRates(order, rates);
            if (supportedRates.size() != rates.size()) {
                log.info(
                        "Shippo rates filtered -> orderId={}, kept={}, removed={}, removedTypes=pickup-point/relay/or-carrier-account-required",
                        order.getOrderId(),
                        supportedRates.size(),
                        rates.size() - supportedRates.size()
                );
            }

            return supportedRates;
        } catch (WebClientResponseException ex) {
            log.error(
                    "Shippo rates HTTP error -> orderId={}, status={}, body={}",
                    order.getOrderId(),
                    ex.getStatusCode(),
                    ex.getResponseBodyAsString()
            );
            return List.of();
        } catch (Exception ex) {
            log.warn("Shippo rates lookup failed for order {}: {}", order.getOrderId(), ex.getMessage());
            return List.of();
        }
    }

    public AdminShipmentActionResponseDto createShipmentForOrder(
            Order order,
            String requestedRateId,
            String requestedCarrier,
            String requestedService,
            String requestedCurrency,
            Float requestedAmount,
            boolean autoSelect,
            boolean testShipmentRequested
    ) {
        if (order == null || order.getShipping() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order shipping is missing");
        }

        Shipping shipping = order.getShipping();
        if (shipping.getShippingMethod() == ShippingMethod.FULLTRUCKLOAD_DHL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shippo is not used for FULLTRUCKLOAD_DHL");
        }

        if (isLegacyFallbackShipment(shipping)) {
            clearLegacyFallbackShipment(shipping);
        } else if (shipping.getTrackingNumber() != null && !shipping.getTrackingNumber().isBlank()) {
            return buildShipmentActionResponse(order);
        }

        boolean forceTestShipment = shippoTestMode || testShipmentRequested;
        String normalizedRateId = requestedRateId == null ? null : requestedRateId.trim();
        if (areRatesEnabled() && !autoSelect && (normalizedRateId == null || normalizedRateId.isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Rate selection is required. Please select a rate in backoffice before shipping."
            );
        }

        // Important: do not re-fetch and re-validate against a brand-new rates list here,
        // because Shippo rate IDs are quote-scoped and can differ between two lookups.
        ShippingRateDto selectedRate = null;
        if (normalizedRateId != null && !normalizedRateId.isBlank()) {
            Float fallbackAmount = shipping.getSelectedRateAmount() != null ? shipping.getSelectedRateAmount().floatValue() : null;
            selectedRate = ShippingRateDto.builder()
                    .rateId(normalizedRateId)
                    .carrierId(firstNonBlank(requestedCarrier, shipping.getCarrier()))
                    .carrier(firstNonBlank(requestedCarrier, shipping.getCarrier()))
                    .service(firstNonBlank(requestedService, shipping.getSelectedRateService(), shippoDefaultService))
                    .currency(firstNonBlank(requestedCurrency, shipping.getSelectedRateCurrency()))
                    .amount(requestedAmount != null ? requestedAmount : fallbackAmount)
                    .selected(true)
                    .build();
        }

        log.info(
                "Shippo shipment request -> orderId={}, requestedRateId={}, requestedCarrier={}, requestedService={}, autoSelect={}, testShipment={}, ratesEnabled={}",
                order.getOrderId(),
                normalizedRateId,
                requestedCarrier,
                requestedService,
                autoSelect,
                forceTestShipment,
                areRatesEnabled()
        );

        ShipmentRegistration shipment = createShipmentOnShippo(order, shipping, selectedRate, forceTestShipment);
        applyShipment(shipping, shipment);

        if (selectedRate != null) {
            shipping.setSelectedRateId(selectedRate.getRateId());
            if (selectedRate.getService() != null && !selectedRate.getService().isBlank()) {
                shipping.setSelectedRateService(selectedRate.getService());
            }
            if (selectedRate.getCurrency() != null && !selectedRate.getCurrency().isBlank()) {
                shipping.setSelectedRateCurrency(selectedRate.getCurrency());
            }
            if (selectedRate.getAmount() != null) {
                shipping.setSelectedRateAmount(BigDecimal.valueOf(selectedRate.getAmount()));
                shipping.setShippingCost(selectedRate.getAmount());
            }
        } else {
            shipping.setSelectedRateId(null);
            shipping.setSelectedRateService(null);
            shipping.setSelectedRateCurrency(null);
            shipping.setSelectedRateAmount(null);
        }

        orderRepository.save(order);
        return buildShipmentActionResponse(order);
    }

    public AdminShipmentActionResponseDto refreshTrackingForOrder(Order order) {
        if (order == null || order.getShipping() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order shipping is missing");
        }
        Shipping shipping = order.getShipping();
        if (shippoApiToken == null || shippoApiToken.isBlank() || shipping.getTrackingNumber() == null || shipping.getTrackingNumber().isBlank()) {
            return buildShipmentActionResponse(order);
        }

        try {
            ShippingStatus previousStatus = shipping.getShippingStatus();
            String previousCarrier = shipping.getCarrier();
            String previousTrackingUrl = shipping.getTrackingUrl();
            boolean refreshed = refreshTrackingFromTransaction(order, shipping, previousStatus, previousCarrier, previousTrackingUrl);

            if (!refreshed) {
                refreshed = refreshTrackingFromTracksApi(order, shipping, previousStatus, previousCarrier, previousTrackingUrl);
            }

            if (!refreshed) {
                log.warn(
                        "Shippo tracking refresh returned no usable update -> orderId={}, trackingNumber={}, transactionId={}",
                        order.getOrderId(),
                        shipping.getTrackingNumber(),
                        shipping.getCarrierShipmentId()
                );
            }
        } catch (Exception ex) {
            log.warn("Shippo tracking refresh failed for order {}: {}", order.getOrderId(), ex.getMessage());
        }
        return buildShipmentActionResponse(order);
    }

    private boolean refreshTrackingFromTransaction(
            Order order,
            Shipping shipping,
            ShippingStatus previousStatus,
            String previousCarrier,
            String previousTrackingUrl
    ) {
        String transactionId = asString(shipping.getCarrierShipmentId());
        if (transactionId == null) {
            return false;
        }

        try {
            log.info(
                    "Shippo transaction refresh request -> orderId={}, transactionId={}, trackingNumber={}",
                    order.getOrderId(),
                    transactionId,
                    shipping.getTrackingNumber()
            );

            Map<?, ?> response = WebClient.create(trimTrailingSlash(shippoApiBaseUrl))
                    .get()
                    .uri("/transactions/{transactionId}", transactionId)
                    .header("Authorization", "ShippoToken " + shippoApiToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null || response.isEmpty()) {
                return false;
            }

            String trackingUrl = asString(response.get("tracking_url_provider"), shipping.getTrackingUrl());
            String trackingNumber = asString(response.get("tracking_number"), shipping.getTrackingNumber());
            String provider = asString(response.get("tracking_provider"), shipping.getCarrier());
            String externalStatus = asString(response.get("tracking_status"));
            ShippingStatus status = resolveRefreshedShippingStatus(externalStatus, shipping);

            if (trackingNumber != null) {
                shipping.setTrackingNumber(trackingNumber);
            }
            if (trackingUrl != null) {
                shipping.setTrackingUrl(trackingUrl);
            }
            if (provider != null) {
                shipping.setCarrier(provider.toUpperCase(Locale.ROOT));
            }
            if (status != null) {
                shipping.setShippingStatus(status);
            }

            log.info(
                    "Shippo transaction refresh response -> orderId={}, transactionId={}, previousStatus={}, newStatus={}, previousCarrier={}, newCarrier={}, externalStatus={}, trackingChanged={}, trackingUrlChanged={}",
                    order.getOrderId(),
                    transactionId,
                    previousStatus,
                    shipping.getShippingStatus(),
                    previousCarrier,
                    shipping.getCarrier(),
                    externalStatus,
                    !Objects.equals(previousStatus, shipping.getShippingStatus()),
                    !Objects.equals(previousTrackingUrl, shipping.getTrackingUrl())
            );

            orderRepository.save(order);
            return true;
        } catch (WebClientResponseException ex) {
            log.warn(
                    "Shippo transaction refresh failed for order {}. HTTP {} body={}",
                    order.getOrderId(),
                    ex.getStatusCode(),
                    ex.getResponseBodyAsString()
            );
            return false;
        } catch (Exception ex) {
            log.warn("Shippo transaction refresh failed for order {}: {}", order.getOrderId(), ex.getMessage());
            return false;
        }
    }

    public AdminShipmentActionResponseDto selectRateForOrder(
            Order order,
            String rateId,
            String carrier,
            String service,
            String currency,
            Float amount
    ) {
        if (order == null || order.getShipping() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order shipping is missing");
        }

        Shipping shipping = order.getShipping();
        String normalizedRateId = asString(rateId);
        if (normalizedRateId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rate selection is missing");
        }

        shipping.setSelectedRateId(normalizedRateId);
        shipping.setCarrier(firstNonBlank(carrier, shipping.getCarrier()));
        shipping.setCarrierServiceCode(firstNonBlank(service, shipping.getCarrierServiceCode(), shippoDefaultService));
        shipping.setSelectedRateService(firstNonBlank(service, shipping.getSelectedRateService(), shippoDefaultService));
        shipping.setSelectedRateCurrency(firstNonBlank(currency, shipping.getSelectedRateCurrency()));
        if (amount != null) {
            shipping.setSelectedRateAmount(BigDecimal.valueOf(amount));
            shipping.setShippingCost(amount);
        }

        orderRepository.save(order);
        log.info(
                "Shippo rate selected -> orderId={}, rateId={}, carrier={}, service={}, currency={}, amount={}",
                order.getOrderId(),
                shipping.getSelectedRateId(),
                shipping.getCarrier(),
                shipping.getSelectedRateService(),
                shipping.getSelectedRateCurrency(),
                shipping.getSelectedRateAmount()
        );
        return buildShipmentActionResponse(order);
    }

    private boolean refreshTrackingFromTracksApi(
            Order order,
            Shipping shipping,
            ShippingStatus previousStatus,
            String previousCarrier,
            String previousTrackingUrl
    ) {
        String carrier = resolveTrackingCarrierToken(shipping);
        if (carrier == null) {
            log.warn(
                    "Shippo tracking refresh skipped -> orderId={}, trackingNumber={}, storedCarrier={}, trackingUrl={}, reason=carrier-unresolved",
                    order.getOrderId(),
                    shipping.getTrackingNumber(),
                    shipping.getCarrier(),
                    compact(shipping.getTrackingUrl())
            );
            return false;
        }

        log.info(
                "Shippo tracking refresh request -> orderId={}, trackingNumber={}, storedCarrier={}, resolvedCarrier={}",
                order.getOrderId(),
                shipping.getTrackingNumber(),
                shipping.getCarrier(),
                carrier
        );

        try {
            Map<?, ?> response = WebClient.create(trimTrailingSlash(shippoApiBaseUrl))
                    .get()
                    .uri("/tracks/{carrier}/{trackingNumber}", carrier, shipping.getTrackingNumber())
                    .header("Authorization", "ShippoToken " + shippoApiToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null || response.isEmpty()) {
                return false;
            }

            String trackingUrl = asString(response.get("tracking_url_provider"), asString(response.get("tracking_url"), shipping.getTrackingUrl()));
            String provider = asString(response.get("carrier"), shipping.getCarrier());
            String externalStatus = extractTrackingStatusValue(response);
            ShippingStatus status = resolveRefreshedShippingStatus(externalStatus, shipping);
            if (trackingUrl != null) {
                shipping.setTrackingUrl(trackingUrl);
            }
            if (provider != null) {
                shipping.setCarrier(provider.toUpperCase(Locale.ROOT));
            }
            if (status != null) {
                shipping.setShippingStatus(status);
            }
            log.info(
                    "Shippo tracking refresh response -> orderId={}, resolvedCarrier={}, previousStatus={}, newStatus={}, previousCarrier={}, newCarrier={}, externalStatus={}, trackingChanged={}, trackingUrlChanged={}",
                    order.getOrderId(),
                    carrier,
                    previousStatus,
                    shipping.getShippingStatus(),
                    previousCarrier,
                    shipping.getCarrier(),
                    externalStatus,
                    !Objects.equals(previousStatus, shipping.getShippingStatus()),
                    !Objects.equals(previousTrackingUrl, shipping.getTrackingUrl())
            );
            orderRepository.save(order);
            return true;
        } catch (WebClientResponseException ex) {
            log.warn(
                    "Shippo tracks refresh failed for order {}. HTTP {} body={}",
                    order.getOrderId(),
                    ex.getStatusCode(),
                    ex.getResponseBodyAsString()
            );
            return false;
        }
    }

    public boolean processIncomingWebhook(
            String rawBody,
            String signatureHeader,
            String timestampHeader,
            String eventIdHeader
    ) {
        if (rawBody == null || rawBody.isBlank()) {
            log.warn("Shippo webhook rejected -> reason=empty-body, eventId={}", eventIdHeader);
            return false;
        }
        if (!verifyWebhookSignature(rawBody, signatureHeader)) {
            log.warn("Shippo webhook rejected -> reason=invalid-signature, eventId={}", eventIdHeader);
            return false;
        }

        Map<String, Object> payload;
        try {
            payload = JSON_PARSER.parseMap(rawBody);
        } catch (Exception ignored) {
            log.warn("Shippo webhook rejected -> reason=invalid-json, eventId={}", eventIdHeader);
            return false;
        }

        String event = asString(payload.get("event"));
        if (event == null) {
            event = asString(payload.get("type"));
        }
        if (event != null && !"track_updated".equalsIgnoreCase(event)) {
            log.info("Shippo webhook ignored -> eventId={}, eventType={}", eventIdHeader, event);
            return true;
        }

        Map<String, Object> data = asMap(payload.get("data"));
        if (data.isEmpty()) {
            log.warn("Shippo webhook rejected -> reason=empty-data, eventId={}", eventIdHeader);
            return false;
        }

        Optional<Order> orderOptional = resolveOrder(data);
        if (orderOptional.isEmpty()) {
            log.warn(
                    "Shippo webhook rejected -> reason=order-not-resolved, eventId={}, trackingNumber={}, metadata={}, objectId={}",
                    eventIdHeader,
                    asString(data.get("tracking_number")),
                    asString(data.get("metadata")),
                    asString(data.get("object_id"))
            );
            return false;
        }

        Order order = orderOptional.get();
        if (order.getShipping() == null) {
            log.warn("Shippo webhook rejected -> reason=missing-shipping, eventId={}, orderId={}", eventIdHeader, order.getOrderId());
            return false;
        }

        Shipping shipping = order.getShipping();
        String trackingNumber = asString(data.get("tracking_number"));
        String carrier = asString(data.get("carrier"));
        String trackingUrl = asString(data.get("tracking_url_provider"));
        if (trackingNumber != null) {
            shipping.setTrackingNumber(trackingNumber);
        }
        if (carrier != null) {
            shipping.setCarrier(carrier.toUpperCase(Locale.ROOT));
        }
        if (trackingUrl != null) {
            shipping.setTrackingUrl(trackingUrl);
        }
        Map<String, Object> trackingStatus = asMap(data.get("tracking_status"));
        ShippingStatus mapped = resolveRefreshedShippingStatus(asString(trackingStatus.get("status")), shipping);
        if (mapped != null) {
            shipping.setShippingStatus(mapped);
        }
        orderRepository.save(order);
        log.info(
                "Shippo webhook applied -> eventId={}, orderId={}, trackingNumber={}, carrier={}, shippingStatus={}",
                eventIdHeader,
                order.getOrderId(),
                shipping.getTrackingNumber(),
                shipping.getCarrier(),
                shipping.getShippingStatus()
        );
        return true;
    }

    private Optional<Order> resolveOrder(Map<String, Object> data) {
        String trackingNumber = asString(data.get("tracking_number"));
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            Optional<Order> byTracking = orderRepository.findFirstByShippingTrackingNumber(trackingNumber.trim());
            if (byTracking.isPresent()) {
                return byTracking;
            }
        }
        String metadata = asString(data.get("metadata"));
        if (metadata != null && !metadata.isBlank()) {
            Optional<Order> byReference = orderRepository.findByReference(metadata.trim());
            if (byReference.isPresent()) {
                return byReference;
            }
        }
        String shipmentObject = asString(data.get("object_id"));
        if (shipmentObject != null && !shipmentObject.isBlank()) {
            Optional<Order> byShipment = orderRepository.findFirstByShippingCarrierShipmentId(shipmentObject.trim());
            if (byShipment.isPresent()) {
                return byShipment;
            }
        }
        return Optional.empty();
    }

    private ShipmentRegistration createShipmentOnShippo(
            Order order,
            Shipping shipping,
            ShippingRateDto forcedRate,
            boolean forceTestShipment
    ) {
        String defaultService = shippoDefaultService == null || shippoDefaultService.isBlank() ? "standard" : shippoDefaultService.trim();

        if (shippoApiToken == null || shippoApiToken.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Shippo API token is not configured."
            );
        }

        try {
            Map<String, Object> shipmentPayload = buildShipmentPayload(order, shipping);
            Map<?, ?> shipmentResponse = WebClient.create(trimTrailingSlash(shippoApiBaseUrl))
                    .post()
                    .uri("/shipments/")
                    .header("Authorization", "ShippoToken " + shippoApiToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(shipmentPayload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (shipmentResponse == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Shippo shipment creation returned an empty response."
                );
            }

            String shipmentId = asString(shipmentResponse.get("object_id"));
            List<ShippingRateDto> rates = mapShippoRates(shipmentResponse, forcedRate != null ? forcedRate.getRateId() : null);
            ShippingRateDto selectedRate = forcedRate;
            if (selectedRate == null && !rates.isEmpty()) {
                selectedRate = rates.stream()
                        .filter(r -> r.getAmount() != null)
                        .min(Comparator.comparing(ShippingRateDto::getAmount))
                        .orElse(rates.get(0));
            }
            if (selectedRate == null || selectedRate.getRateId() == null || selectedRate.getRateId().isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Shippo did not return a valid rate for this shipment. Please refresh rates and try again."
                );
            }

            Map<String, Object> txPayload = new LinkedHashMap<>();
            txPayload.put("rate", selectedRate.getRateId());
            txPayload.put("label_file_type", "PDF");
            txPayload.put("async", false);
            txPayload.put("metadata", order.getReference());
            txPayload.put("test", forceTestShipment);

            Map<?, ?> txResponse = WebClient.create(trimTrailingSlash(shippoApiBaseUrl))
                    .post()
                    .uri("/transactions/")
                    .header("Authorization", "ShippoToken " + shippoApiToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(txPayload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (txResponse == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Shippo transaction creation returned an empty response."
                );
            }

            String transactionId = asString(txResponse.get("object_id"), shipmentId);
            String labelUrl = asString(txResponse.get("label_url"));
            String trackingNumber = asString(txResponse.get("tracking_number"));
            String trackingUrl = asString(txResponse.get("tracking_url_provider"));
            String carrier = asString(txResponse.get("tracking_provider"), selectedRate.getCarrier());
            String service = selectedRate.getService() == null ? defaultService : selectedRate.getService();

            ShippingStatus status = ShippingStatus.IN_TRANSIT;
            String txStatus = asString(txResponse.get("status"));
            if (txStatus != null && ("ERROR".equalsIgnoreCase(txStatus) || "INVALID".equalsIgnoreCase(txStatus))) {
                String txMessages = compact(txResponse.get("messages"));
                log.warn(
                        "Shippo transaction rejected -> orderId={}, status={}, messages={}",
                        order.getOrderId(),
                        txStatus,
                        txMessages
                );
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        buildTransactionFailureMessage(txMessages)
                );
            }
            if (labelUrl == null || labelUrl.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Shippo transaction completed without label URL."
                );
            }

            return new ShipmentRegistration(
                    trackingNumber,
                    transactionId,
                    carrier == null ? "SHIPPO" : carrier.toUpperCase(Locale.ROOT),
                    service,
                    trackingUrl,
                    labelUrl,
                    status,
                    forceTestShipment
            );
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (WebClientResponseException ex) {
            log.error("Shippo shipment failed for order {}. HTTP {} body={}",
                    order.getOrderId(), ex.getStatusCode(), ex.getResponseBodyAsString());
            if (ex.getStatusCode().is4xxClientError() && isRateInvalidOrExpiredError(ex.getResponseBodyAsString())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Selected rate is invalid or expired at Shippo. Please refresh rates and select another one."
                );
            }
            HttpStatus mappedStatus = ex.getStatusCode().is4xxClientError()
                    ? HttpStatus.CONFLICT
                    : HttpStatus.BAD_GATEWAY;
            throw new ResponseStatusException(
                    mappedStatus,
                    "Shippo shipment failed: " + compact(ex.getResponseBodyAsString())
            );
        } catch (Exception ex) {
            log.error("Shippo shipment failed for order {} with unexpected error", order.getOrderId(), ex);
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Shippo shipment failed unexpectedly: " + ex.getMessage()
            );
        }
    }

    private void applyShipment(Shipping shipping, ShipmentRegistration shipment) {
        shipping.setCarrier(shipment.carrier());
        shipping.setCarrierServiceCode(shipment.serviceCode());
        shipping.setCarrierShipmentId(shipment.shipmentId());
        shipping.setTrackingNumber(shipment.trackingNumber());
        shipping.setTrackingUrl(shipment.trackingUrl());
        shipping.setShippingStatus(shipment.shippingStatus());
        shipping.setLabelUrl(shipment.labelUrl());
        shipping.setTestShipment(shipment.testShipment());
        shipping.setSimulatedShipment(false);
    }

    private List<ShippingRateDto> mapShippoRates(Map<?, ?> shipmentResponse, String selectedRateId) {
        Object ratesObj = shipmentResponse.get("rates");
        if (!(ratesObj instanceof List<?> rawRates)) {
            return List.of();
        }
        List<ShippingRateDto> rates = new ArrayList<>();
        for (Object raw : rawRates) {
            if (!(raw instanceof Map<?, ?> rateMap)) {
                continue;
            }
            String rateId = asString(rateMap.get("object_id"));
            String carrier = asString(rateMap.get("provider"));
            String amountStr = asString(rateMap.get("amount"));
            String currency = asString(rateMap.get("currency"), "USD");
            String service = null;
            Object serviceLevelObj = rateMap.get("servicelevel");
            if (serviceLevelObj instanceof Map<?, ?> slMap) {
                service = asString(slMap.get("name"), asString(slMap.get("token")));
            }
            Float amount = null;
            if (amountStr != null) {
                try {
                    amount = Float.parseFloat(amountStr);
                } catch (Exception ignored) {
                }
            }
            Integer eta = null;
            try {
                String etaStr = asString(rateMap.get("estimated_days"));
                if (etaStr != null) {
                    eta = Integer.parseInt(etaStr);
                }
            } catch (Exception ignored) {
            }

            rates.add(ShippingRateDto.builder()
                    .rateId(rateId)
                    .carrierId(carrier)
                    .carrier(carrier)
                    .service(service == null ? "standard" : service)
                    .currency(currency)
                    .amount(amount)
                    .estimatedDays(eta)
                    .selected(selectedRateId != null && selectedRateId.equals(rateId))
                    .build());
        }
        return rates;
    }

    private List<ShippingRateDto> filterSupportedRates(Order order, List<ShippingRateDto> rates) {
        if (rates == null || rates.isEmpty()) {
            return List.of();
        }

        List<ShippingRateDto> filtered = rates.stream()
                .filter(rate -> !requiresPickupPoint(rate))
                .filter(rate -> !requiresOwnCarrierAccount(rate))
                .toList();

        if (filtered.isEmpty()) {
            log.warn(
                    "All Shippo rates were filtered out for order {} because they require pickup-point data or a carrier account not available in the current configuration.",
                    order != null ? order.getOrderId() : null
            );
        }

        return filtered;
    }

    private boolean requiresPickupPoint(ShippingRateDto rate) {
        if (rate == null) {
            return false;
        }

        String carrier = normalizeForMatching(rate.getCarrier());
        String service = normalizeForMatching(rate.getService());
        String carrierId = normalizeForMatching(rate.getCarrierId());
        String combined = carrier + " " + carrierId + " " + service;

        boolean mentionsPickupConcept = combined.contains("pickup")
                || combined.contains("pickup point")
                || combined.contains("relay")
                || combined.contains("point relais")
                || combined.contains("point retrait")
                || combined.contains("pudo")
                || combined.contains("parcel shop")
                || combined.contains("pick up");

        boolean carrierUsuallyNeedsPickupCode = combined.contains("colissimo")
                || combined.contains("mondial")
                || combined.contains("relay");

        return mentionsPickupConcept && carrierUsuallyNeedsPickupCode;
    }

    private String normalizeForMatching(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean requiresOwnCarrierAccount(ShippingRateDto rate) {
        if (rate == null || shippoRealCarrierConfigured) {
            return false;
        }

        String carrier = normalizeForMatching(rate.getCarrier());
        String service = normalizeForMatching(rate.getService());
        String carrierId = normalizeForMatching(rate.getCarrierId());
        String combined = carrier + " " + carrierId + " " + service;

        return combined.contains("colissimo")
                || combined.contains("chronopost")
                || combined.contains("laposte")
                || combined.contains("la poste");
    }

    private Map<String, Object> buildShipmentPayload(Order order, Shipping shipping) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("address_from", buildFromAddress());
        payload.put("address_to", buildToAddress(shipping, order));
        payload.put("parcels", List.of(defaultParcel(order)));
        payload.put("async", false);
        payload.put("metadata", order.getReference());
        return payload;
    }

    private Map<String, Object> buildFromAddress() {
        Map<String, Object> from = new LinkedHashMap<>();
        from.put("name", senderFullName);
        from.put("company", senderCompany);
        from.put("email", senderEmail);
        from.put("phone", senderPhone);
        from.put("country", senderCountry);
        from.put("zip", senderZip);
        from.put("city", senderCity);
        from.put("street1", senderAddress1);
        if (senderState != null && !senderState.isBlank()) {
            from.put("state", senderState.trim());
        }
        if (senderAddress2 != null && !senderAddress2.isBlank()) {
            from.put("street2", senderAddress2);
        }
        return from;
    }

    private Map<String, Object> buildToAddress(Shipping shipping, Order order) {
        Adress address = shipping != null ? shipping.getShippingAddress() : null;
        String fullName = shipping != null ? safe(shipping.getRecipientFullName()) : "";
        String company = shipping != null ? safe(shipping.getRecipientCompany()) : "";
        String email = shipping != null ? safe(shipping.getRecipientEmail()) : null;
        String phone = shipping != null ? safe(shipping.getRecipientPhone()) : "";

        if (order != null && order.getUser() != null) {
            if (fullName.isBlank()) {
                fullName = (safe(order.getUser().getFirstName()) + " " + safe(order.getUser().getLastName())).trim();
            }
            if (company.isBlank()) {
                company = safe(order.getUser().getCompanyName());
            }
            if (email == null || email.isBlank()) {
                email = order.getUser().getEmail();
            }
        }

        if (fullName.isBlank()) {
            fullName = "Customer";
        }
        if (company.isBlank()) {
            company = "N/A";
        }
        if (phone.isBlank()) {
            phone = senderPhone != null && !senderPhone.isBlank() ? senderPhone : "0000000000";
        }

        Map<String, Object> to = new LinkedHashMap<>();
        to.put("name", fullName);
        to.put("company", company);
        to.put("email", email);
        to.put("phone", phone);
        to.put("country", normalizeCountryCode(address != null ? address.getCountryCode() : null));
        to.put("zip", address != null ? safe(address.getZipcode()) : "");
        to.put("city", address != null ? safe(address.getCity()) : "");
        to.put("street1", address != null ? safe(address.getStreet()) : "");
        if (address != null && address.getState() != null && !address.getState().isBlank()) {
            to.put("state", address.getState().trim());
        }
        return to;
    }

    private Map<String, Object> defaultParcel(Order order) {
        int totalQty = 1;
        if (order.getOrderLines() != null && !order.getOrderLines().isEmpty()) {
            totalQty = order.getOrderLines().stream()
                    .map(OrderLine::getQuantity)
                    .filter(Objects::nonNull)
                    .mapToInt(Integer::intValue)
                    .sum();
            if (totalQty <= 0) {
                totalQty = 1;
            }
        }
        Map<String, Object> parcel = new LinkedHashMap<>();
        parcel.put("length", "25");
        parcel.put("width", "20");
        parcel.put("height", "10");
        parcel.put("distance_unit", "cm");
        parcel.put("weight", String.valueOf(Math.max(totalQty * 500, 500)));
        parcel.put("mass_unit", "g");
        return parcel;
    }

    private AdminShipmentActionResponseDto buildShipmentActionResponse(Order order) {
        Shipping shipping = order.getShipping();
        return AdminShipmentActionResponseDto.builder()
                .orderId(order.getOrderId())
                .carrier(shipping != null ? shipping.getCarrier() : null)
                .service(shipping != null ? shipping.getCarrierServiceCode() : null)
                .shippingStatus(shipping != null && shipping.getShippingStatus() != null ? shipping.getShippingStatus().name() : null)
                .trackingNumber(shipping != null ? shipping.getTrackingNumber() : null)
                .trackingUrl(shipping != null ? shipping.getTrackingUrl() : null)
                .carrierShipmentId(shipping != null ? shipping.getCarrierShipmentId() : null)
                .labelUrl(shipping != null ? shipping.getLabelUrl() : null)
                .selectedRateId(shipping != null ? shipping.getSelectedRateId() : null)
                .rateCurrency(shipping != null ? shipping.getSelectedRateCurrency() : null)
                .rateAmount(shipping != null && shipping.getSelectedRateAmount() != null ? shipping.getSelectedRateAmount().floatValue() : null)
                .testShipment(shipping != null && shipping.isTestShipment())
                .build();
    }

    private boolean verifyWebhookSignature(String rawBody, String signatureHeader) {
        if (shippoWebhookSecret == null || shippoWebhookSecret.isBlank()) {
            return true;
        }
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        String hash = hmacSha256(rawBody, shippoWebhookSecret.trim());
        String signature = signatureHeader.trim();
        return Objects.equals(signature, hash) || Objects.equals(signature, "sha256=" + hash);
    }

    private String hmacSha256(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(digest);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            builder.append(String.format("%02x", b));
        }
        return builder.toString();
    }

    private ShippingStatus parseShippingStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        return switch (normalized) {
            case "UNKNOWN" -> null;
            case "PRE_TRANSIT", "PENDING", "LABEL_CREATED", "LABEL_PURCHASED" -> ShippingStatus.PENDING;
            case "TRANSIT", "IN_TRANSIT", "OUT_FOR_DELIVERY" -> ShippingStatus.IN_TRANSIT;
            case "SHIPPED" -> ShippingStatus.SHIPPED;
            case "DELIVERED" -> ShippingStatus.DELIVERED;
            case "RETURNED", "RETURN_TO_SENDER" -> ShippingStatus.RETURNED;
            case "FAILURE", "EXCEPTION" -> ShippingStatus.PROCESSING;
            default -> ShippingStatus.IN_TRANSIT;
        };
    }

    private ShippingStatus resolveRefreshedShippingStatus(String externalStatus, Shipping shipping) {
        ShippingStatus parsed = parseShippingStatus(externalStatus);
        if (parsed != null) {
            return parsed;
        }

        if (externalStatus == null || externalStatus.isBlank()) {
            return shipping != null ? shipping.getShippingStatus() : null;
        }

        String normalized = externalStatus.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        if (!"UNKNOWN".equals(normalized)) {
            return shipping != null ? shipping.getShippingStatus() : null;
        }

        if (shipping == null) {
            return null;
        }

        if (shipping.getShippingStatus() != null && shipping.getShippingStatus() != ShippingStatus.PENDING) {
            return shipping.getShippingStatus();
        }

        boolean hasShipmentArtifacts =
                (shipping.getTrackingNumber() != null && !shipping.getTrackingNumber().isBlank())
                        || (shipping.getCarrierShipmentId() != null && !shipping.getCarrierShipmentId().isBlank())
                        || (shipping.getLabelUrl() != null && !shipping.getLabelUrl().isBlank());

        return hasShipmentArtifacts ? ShippingStatus.IN_TRANSIT : shipping.getShippingStatus();
    }

    private String normalizeCountryCode(String value) {
        if (value == null || value.isBlank() || "N/A".equalsIgnoreCase(value.trim())) {
            return "FR";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String resolveTrackingCarrierToken(Shipping shipping) {
        if (shipping == null) {
            return null;
        }

        String fromCarrier = normalizeTrackingCarrierToken(shipping.getCarrier());
        if (fromCarrier != null) {
            return fromCarrier;
        }

        String fromTrackingUrl = inferTrackingCarrierFromUrl(shipping.getTrackingUrl());
        if (fromTrackingUrl != null) {
            return fromTrackingUrl;
        }

        String fromServiceCode = normalizeTrackingCarrierToken(shipping.getCarrierServiceCode());
        if (fromServiceCode != null) {
            return fromServiceCode;
        }

        return null;
    }

    private String inferTrackingCarrierFromUrl(String trackingUrl) {
        if (trackingUrl == null || trackingUrl.isBlank()) {
            return null;
        }

        String normalized = trackingUrl.trim().toLowerCase(Locale.ROOT);
        if (normalized.contains("usps.com")) {
            return "usps";
        }
        if (normalized.contains("dhl.com")) {
            return "dhl_express";
        }
        if (normalized.contains("ups.com")) {
            return "ups";
        }
        if (normalized.contains("fedex.com")) {
            return "fedex";
        }
        if (normalized.contains("colissimo") || normalized.contains("laposte")) {
            return "colissimo";
        }
        if (normalized.contains("chronopost")) {
            return "chronopost";
        }
        return null;
    }

    private String normalizeTrackingCarrierToken(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');

        return switch (normalized) {
            case "standard", "express", "freight_shipping", "fulltruckload_dhl", "full_truckload", "shippo",
                 "shippo_simulation", "shippo_fallback" -> null;
            case "usps", "shippo_usps_master" -> "usps";
            case "ups" -> "ups";
            case "fedex" -> "fedex";
            case "dhl", "dhlexpress", "dhl_express" -> "dhl_express";
            case "colissimo" -> "colissimo";
            case "chronopost" -> "chronopost";
            default -> {
                if (normalized.contains("usps")) {
                    yield "usps";
                }
                if (normalized.contains("dhl")) {
                    yield "dhl_express";
                }
                if (normalized.contains("ups")) {
                    yield "ups";
                }
                if (normalized.contains("fedex")) {
                    yield "fedex";
                }
                if (normalized.contains("colissimo")) {
                    yield "colissimo";
                }
                if (normalized.contains("chronopost")) {
                    yield "chronopost";
                }
                yield normalized;
            }
        };
    }

    private String extractTrackingStatusValue(Map<?, ?> response) {
        if (response == null || response.isEmpty()) {
            return null;
        }

        Map<String, Object> trackingStatus = asMap(response.get("tracking_status"));
        String directStatus = asString(trackingStatus.get("status"));
        if (directStatus != null) {
            return directStatus;
        }

        Object historyObj = response.get("tracking_history");
        if (historyObj instanceof List<?> history && !history.isEmpty()) {
            for (int index = history.size() - 1; index >= 0; index--) {
                Object item = history.get(index);
                if (item instanceof Map<?, ?> historyMap) {
                    String historyStatus = asString(historyMap.get("status"));
                    if (historyStatus != null) {
                        return historyStatus;
                    }
                }
            }
        }

        String deliveryStatus = asString(response.get("delivery_status"));
        if (deliveryStatus != null) {
            return deliveryStatus;
        }

        return asString(response.get("status"));
    }

    private boolean requiresAdministrativeArea(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            return false;
        }
        String normalized = countryCode.trim().toUpperCase(Locale.ROOT);
        return "US".equals(normalized) || "CA".equals(normalized) || "AU".equals(normalized);
    }

    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> raw) {
            Map<String, Object> mapped = new LinkedHashMap<>();
            raw.forEach((k, v) -> mapped.put(String.valueOf(k), v));
            return mapped;
        }
        return Map.of();
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String normalized = String.valueOf(value).trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String asString(Object value, String fallback) {
        String normalized = asString(value);
        return normalized == null ? fallback : normalized;
    }

    private String trimTrailingSlash(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "https://api.goshippo.com";
        }
        String trimmed = baseUrl.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String compact(Object value) {
        if (value == null) {
            return "null";
        }
        String raw = String.valueOf(value).replaceAll("\\s+", " ").trim();
        if (raw.length() > 300) {
            return raw.substring(0, 300) + "...";
        }
        return raw;
    }

    private boolean isRateInvalidOrExpiredError(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return false;
        }
        String normalized = responseBody.toLowerCase(Locale.ROOT);
        return normalized.contains("invalid rate")
                || normalized.contains("rate is invalid")
                || normalized.contains("rate object")
                || normalized.contains("invalid rate object")
                || normalized.contains("expired")
                || (normalized.contains("\"rate\"") && normalized.contains("invalid"));
    }

    private String buildTransactionFailureMessage(String txMessages) {
        String normalized = txMessages == null ? "" : txMessages.toLowerCase(Locale.ROOT);
        if (normalized.contains("apikey obligatoire")
                || normalized.contains("api key obligatoire")
                || normalized.contains("identifiant/mot de passe")
                || normalized.contains("username/password")
                || normalized.contains("password")
                || normalized.contains("api key")) {
            return "The selected rate requires a configured carrier account in Shippo. Choose another rate or connect the carrier account first. " + txMessages;
        }
        return "Shippo transaction failed for selected rate. " + txMessages;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private boolean isLegacyFallbackShipment(Shipping shipping) {
        if (shipping == null) {
            return false;
        }
        if (shipping.isSimulatedShipment()) {
            return true;
        }
        String carrier = shipping.getCarrier();
        if (carrier == null || carrier.isBlank()) {
            return false;
        }
        String normalizedCarrier = carrier.trim().toUpperCase(Locale.ROOT);
        return normalizedCarrier.startsWith("SHIPPO_SIMULATION")
                || normalizedCarrier.startsWith("SHIPPO_FALLBACK");
    }

    private void clearLegacyFallbackShipment(Shipping shipping) {
        shipping.setCarrier(null);
        shipping.setCarrierServiceCode(null);
        shipping.setCarrierShipmentId(null);
        shipping.setTrackingNumber(null);
        shipping.setTrackingUrl(null);
        shipping.setLabelUrl(null);
        shipping.setShippingStatus(ShippingStatus.PENDING);
        shipping.setTestShipment(false);
        shipping.setSimulatedShipment(false);
    }

    private record ShipmentRegistration(
            String trackingNumber,
            String shipmentId,
            String carrier,
            String serviceCode,
            String trackingUrl,
            String labelUrl,
            ShippingStatus shippingStatus,
            boolean testShipment
    ) {
    }
}
