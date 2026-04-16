package tn.epac.eprinting.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class DhlTrackingConfig {

    @Bean
    public WebClient dhlTrackingWebClient() {
        return WebClient.builder()
                .baseUrl("https://api-eu.dhl.com")
                .build();
    }
}