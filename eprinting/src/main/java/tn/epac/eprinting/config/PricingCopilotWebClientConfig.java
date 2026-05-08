package tn.epac.eprinting.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PricingCopilotWebClientConfig {

    @Value("${pricing.copilot.base-url:http://localhost:8001}")
    private String pricingCopilotBaseUrl;

    @Bean
    public WebClient pricingCopilotWebClient() {
        return WebClient.builder()
                .baseUrl(pricingCopilotBaseUrl)
                .build();
    }
}
