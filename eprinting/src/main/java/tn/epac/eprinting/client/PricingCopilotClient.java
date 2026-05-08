package tn.epac.eprinting.client;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import tn.epac.eprinting.model.dtos.CopilotInterpretationRequestDto;
import tn.epac.eprinting.model.dtos.CopilotInterpretationResponseDto;
import tn.epac.eprinting.model.dtos.CopilotPricingAnalyzeResponseDto;

@Component
public class PricingCopilotClient {

    private final WebClient pricingCopilotWebClient;

    public PricingCopilotClient(WebClient pricingCopilotWebClient) {
        this.pricingCopilotWebClient = pricingCopilotWebClient;
    }

    public CopilotInterpretationResponseDto interpret(CopilotInterpretationRequestDto request) {
        return pricingCopilotWebClient.post()
                .uri("/interpret-pricing")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(CopilotInterpretationResponseDto.class)
                .block();
    }

    public CopilotPricingAnalyzeResponseDto analyze(CopilotInterpretationRequestDto request) {
        return pricingCopilotWebClient.post()
                .uri("/analyze-pricing")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(CopilotPricingAnalyzeResponseDto.class)
                .block();
    }
}
