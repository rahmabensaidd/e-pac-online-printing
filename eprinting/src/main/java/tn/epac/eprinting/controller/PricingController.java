package tn.epac.eprinting.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.model.dtos.QuoteRequestDto;
import tn.epac.eprinting.model.dtos.QuoteResponseDto;
import tn.epac.eprinting.serviceimpl.PricingApplicationService;

@RestController
@RequestMapping("/api/pricing")
public class PricingController {

    private final PricingApplicationService pricingApplicationService;

    public PricingController(PricingApplicationService pricingApplicationService) {
        this.pricingApplicationService = pricingApplicationService;
    }

    @PostMapping("/quote")
    public ResponseEntity<QuoteResponseDto> quote(@RequestBody QuoteRequestDto request) {
        return ResponseEntity.ok(pricingApplicationService.getQuote(request));
    }
}