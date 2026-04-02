package tn.epac.eprinting.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String issuerUri;

    @Value("${keycloak.client-id:eprinting-backend}")
    private String expectedClientId;

    @Value("${security.authentication.mode:oauth2}")
    private String authMode;

    /**
     * Configuration de sécurité principale
     * Active OAuth2 si issuerUri est configuré, sinon désactive la sécurité
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        // Désactiver CSRF pour toutes les configurations
        http.csrf(AbstractHttpConfigurer::disable);

        // Désactiver formLogin et httpBasic par défaut
        http.formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable);

        // Configuration selon le mode d'authentification
        if ("oauth2".equalsIgnoreCase(authMode) && issuerUri != null && !issuerUri.isEmpty()) {
            // Mode OAuth2 avec Keycloak
            configureOAuth2Mode(http);
        } else if ("permit-all".equalsIgnoreCase(authMode)) {
            // Mode permit all (développement)
            configurePermitAllMode(http);
        } else {
            // Mode par défaut : tout autoriser
            configurePermitAllMode(http);
        }

        return http.build();
    }

    /**
     * Configuration pour OAuth2 avec Keycloak
     */
    private void configureOAuth2Mode(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers("/public/**", "/actuator/health", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("admin")
                        .requestMatchers("/api/user/**").hasAnyRole("user", "admin")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(jwtDecoder())
                                .jwtAuthenticationConverter(jwtAuthenticationConverter())
                        )
                );
    }

    /**
     * Configuration pour permit all (développement)
     */
    private void configurePermitAllMode(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                );
    }

    /**
     * Décodeur JWT pour Keycloak (uniquement si OAuth2 est activé)
     */
    @Bean
    @ConditionalOnProperty(name = "security.authentication.mode", havingValue = "oauth2", matchIfMissing = false)
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder jwtDecoder = JwtDecoders.fromOidcIssuerLocation(issuerUri);

        // Validateur pour le client (azp)
        OAuth2TokenValidator<Jwt> clientValidator = new JwtClaimValidator<>(
                "azp",
                expectedClientId::equals
        );

        // Validateur par défaut (issuer, expires, etc.)
        OAuth2TokenValidator<Jwt> defaultValidator = JwtValidators.createDefaultWithIssuer(issuerUri);

        // Combiner les validateurs
        OAuth2TokenValidator<Jwt> delegatingValidator = new DelegatingOAuth2TokenValidator<>(
                defaultValidator,
                clientValidator
        );

        jwtDecoder.setJwtValidator(delegatingValidator);

        return jwtDecoder;
    }

    /**
     * Convertisseur JWT pour Keycloak
     */
    @Bean
    @ConditionalOnProperty(name = "security.authentication.mode", havingValue = "oauth2", matchIfMissing = false)
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRealmRoleConverter());
        return converter;
    }

    /**
     * Convertisseur personnalisé pour extraire les rôles Keycloak du JWT
     */
    static class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

        @Override
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            // Extraction des rôles du realm_access
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");

            if (realmAccess == null || realmAccess.isEmpty()) {
                return List.of();
            }

            @SuppressWarnings("unchecked")
            Collection<String> roles = (Collection<String>) realmAccess.get("roles");

            if (roles == null || roles.isEmpty()) {
                return List.of();
            }

            return roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
        }
    }
}