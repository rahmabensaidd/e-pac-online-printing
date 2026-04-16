package tn.epac.eprinting.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PricingWebClientConfig {

    @Bean
    public WebClient pricingWebClient() {
        return WebClient.builder()
                .baseUrl("http://localhost:8000")
                .build();
    }
}
