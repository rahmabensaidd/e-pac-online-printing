package tn.epac.eprinting.client;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import tn.epac.eprinting.model.dtos.PricingApiRequestDto;

import java.util.Map;

@Component
public class PricingApiClient {

    private final WebClient pricingWebClient;

    public PricingApiClient(WebClient pricingWebClient) {
        this.pricingWebClient = pricingWebClient;
    }

    public Map<String, Object> predict(PricingApiRequestDto request) {
        return pricingWebClient.post()
                .uri("/predict")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
    }

    public Map<String, Object> getClientFeatures(String siren) {
        return pricingWebClient.get()
                .uri(uriBuilder -> uriBuilder.path("/features/client/{siren}").build(siren))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
    }
}
