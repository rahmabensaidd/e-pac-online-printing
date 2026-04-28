package tn.epac.eprinting.security;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${security.authentication.mode:jwt}")
    private String authMode;

    @Value("${security.jwt.secret:change-me-please-change-me-please-123456789}")
    private String jwtSecret;

    @PostConstruct
    public void initStripe() {
        Stripe.apiKey = stripeSecretKey;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Désactiver les fonctionnalités non nécessaires pour une API stateless
        http.csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        // Mode permit-all pour le développement (optionnel)
        if ("permit-all".equalsIgnoreCase(authMode)) {
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }

        // Configuration des autorisations
        http.authorizeHttpRequests(authz -> authz
                        // Endpoints publics
                        .requestMatchers(
                                "/public/**",
                                "/actuator/health",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/api/books/marketplace/**",
                                "/api/pricing/**",
                                "/api/cart/**",
                                "/api/auth/signup",
                                "/api/auth/register-organization",
                                "/api/auth/login",
                                "/api/payments/webhook",  // Webhook Stripe public
                                "/api/webhooks/shippo" // Webhook Shippo public
                        ).permitAll()
                        // Endpoints admin
                        .requestMatchers("/api/admin/**").hasRole("admin")
                        // Endpoints checkout
                        .requestMatchers("/api/orders/checkout").hasAnyRole("user", "admin", "organization")
                        // Endpoints user
                        .requestMatchers("/api/user/**").hasAnyRole("user", "admin", "organization")
                        .requestMatchers("/api/cover-templates/**").hasAnyRole("user", "admin", "organization")
                        // Tout autre endpoint nécessite une authentification
                        .anyRequest().authenticated()
                )
                // Configuration OAuth2 Resource Server avec JWT
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey())
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefault());
        return decoder;
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey()));
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Object claim = jwt.getClaim("roles");
            if (!(claim instanceof Collection<?> rawRoles)) {
                return Set.<GrantedAuthority>of();
            }

            Set<GrantedAuthority> authorities = new LinkedHashSet<>();
            for (Object rawRole : rawRoles) {
                String normalized = String.valueOf(rawRole).trim();
                if (normalized.isEmpty()) {
                    continue;
                }
                authorities.add(new SimpleGrantedAuthority("ROLE_" + normalized.toLowerCase()));
                authorities.add(new SimpleGrantedAuthority("ROLE_" + normalized.toUpperCase()));
            }
            return authorities;
        });
        return converter;
    }

    private SecretKey secretKey() {
        byte[] key = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return new SecretKeySpec(key, "HmacSHA256");
    }
}
