package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.serviceimpl.ShippoShippingService;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/shippo")
@RequiredArgsConstructor
@Slf4j
public class ShippoWebhookController {

    private final ShippoShippingService shippoShippingService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> receive(
            @RequestBody String rawBody,
            @RequestHeader(value = "Shippo-Signature", required = false) String signature,
            @RequestHeader(value = "X-Shippo-Signature", required = false) String signatureAlt,
            @RequestHeader(value = "X-Shippo-Timestamp", required = false) String timestamp,
            @RequestHeader(value = "X-Shippo-Event-Id", required = false) String eventId
    ) {
        String resolvedSignature = signature != null ? signature : signatureAlt;
        log.info(
                "Shippo webhook received -> eventId={}, timestamp={}, hasSignature={}, payloadSize={}",
                eventId,
                timestamp,
                resolvedSignature != null && !resolvedSignature.isBlank(),
                rawBody != null ? rawBody.length() : 0
        );
        boolean processed = shippoShippingService.processIncomingWebhook(rawBody, resolvedSignature, timestamp, eventId);
        if (!processed) {
            log.warn("Shippo webhook acknowledged without update -> eventId={}, reason=invalid-payload-or-signature", eventId);
            return ResponseEntity.ok(
                    Map.of(
                            "updated", false,
                            "acknowledged", true,
                            "message", "Webhook received but no order update was applied"
                    )
            );
        }
        log.info("Shippo webhook processed -> eventId={}", eventId);
        return ResponseEntity.ok(Map.of("updated", true, "acknowledged", true));
    }
}
