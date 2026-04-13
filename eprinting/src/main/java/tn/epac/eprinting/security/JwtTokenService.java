package tn.epac.eprinting.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.model.enums.UserType;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtTokenService {

    private final JwtEncoder jwtEncoder;

    @Value("${security.jwt.expiration-seconds:3600}")
    private long expirationSeconds;

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expirationSeconds);
        String normalizedRole = (user.getRole() == null ? Role.USER.name() : user.getRole().name()).toLowerCase();
        String normalizedUserType = (user.getUserType() == null ? UserType.SIMPLE.name() : user.getUserType().name()).toLowerCase();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("eprinting-backend")
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.getUsername())
                .claim("user_id", user.getUserId())
                .claim("email", user.getEmail())
                .claim("preferred_username", user.getUsername())
                .claim("given_name", user.getFirstName())
                .claim("family_name", user.getLastName())
                .claim("roles", List.of(normalizedRole))
                .claim("user_type", normalizedUserType)
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }
}
