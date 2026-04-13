package tn.epac.eprinting.serviceimpl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class OrganizationVerificationTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${security.organization.verification-token.ttl-hours:168}")
    private long tokenTtlHours;

    @Value("${security.organization.verification-token.pepper:eprinting-org-token-pepper}")
    private String tokenPepper;

    public String generateRawToken() {
        byte[] randomBytes = new byte[48];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest((tokenPepper + ":" + rawToken).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Unable to hash organization verification token", exception);
        }
    }

    public LocalDateTime calculateExpiryDate() {
        return LocalDateTime.now().plusHours(tokenTtlHours);
    }
}
