package tn.epac.eprinting.controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/client-info")
    public Map<String, Object> getClientInfo(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
                "clientId", jwt.getClaim("azp"),  // Authorized Party - le client qui a reçu le token
                "audience", jwt.getAudience(),
                "subject", jwt.getSubject(),
                "issuedFor", jwt.getClaim("azp")
        );
    }
}
