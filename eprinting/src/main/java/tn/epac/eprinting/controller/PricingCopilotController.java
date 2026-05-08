package tn.epac.eprinting.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.model.dtos.CopilotPricingAnalyzeRequestDto;
import tn.epac.eprinting.model.dtos.CopilotPricingAnalyzeResponseDto;
import tn.epac.eprinting.serviceimpl.PricingCopilotService;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/copilot/pricing")
public class PricingCopilotController {

    private final PricingCopilotService pricingCopilotService;

    public PricingCopilotController(PricingCopilotService pricingCopilotService) {
        this.pricingCopilotService = pricingCopilotService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<CopilotPricingAnalyzeResponseDto> analyze(@RequestBody CopilotPricingAnalyzeRequestDto request) {
        try {
            return ResponseEntity.ok(pricingCopilotService.analyze(request));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }
}
