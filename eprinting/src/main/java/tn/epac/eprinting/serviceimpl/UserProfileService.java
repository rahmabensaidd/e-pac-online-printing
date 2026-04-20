package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.UserProfileResponseDto;
import tn.epac.eprinting.model.dtos.UserProfileUpdateRequestDto;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.repository.UserRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserProfileService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public UserProfileResponseDto getCurrentProfile(Jwt jwt) {
        User user = resolveCurrentUser(jwt);
        return mapToDto(user);
    }

    public UserProfileResponseDto updateCurrentProfile(Jwt jwt, UserProfileUpdateRequestDto request) {
        User user = resolveCurrentUser(jwt);
        user.setFirstName(trimToNull(request.getFirstName()));
        user.setLastName(trimToNull(request.getLastName()));
        user.setPhoneNumber(trimToNull(request.getPhone()));
        user.setCompanyName(trimToNull(request.getCompany()));
        user.setAddressLine1(trimToNull(request.getAddressLine1()));
        user.setAddressLine2(trimToNull(request.getAddressLine2()));
        user.setCity(trimToNull(request.getCity()));
        user.setState(trimToNull(request.getState()));
        user.setPostalCode(trimToNull(request.getPostalCode()));
        user.setCountry(normalizeCountryName(request.getCountry()));
        user.setCountryCode(normalizeCountryCode(request.getCountry()));
        return mapToDto(userRepository.save(user));
    }

    private User resolveCurrentUser(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        Object userIdClaim = jwt.getClaim("user_id");
        if (userIdClaim instanceof Number number) {
            Optional<User> byId = userRepository.findById(number.longValue());
            if (byId.isPresent()) {
                return byId.get();
            }
        }
        if (userIdClaim instanceof String value) {
            try {
                Optional<User> byId = userRepository.findById(Long.parseLong(value));
                if (byId.isPresent()) {
                    return byId.get();
                }
            } catch (NumberFormatException ignored) {
                // Fallback to email/username resolution below.
            }
        }

        String email = jwt.getClaimAsString("email");
        if (email != null && !email.isBlank()) {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                return byEmail.get();
            }
        }

        String username = jwt.getClaimAsString("preferred_username");
        if ((username == null || username.isBlank()) && jwt.getSubject() != null) {
            username = jwt.getSubject();
        }
        if (username != null && !username.isBlank()) {
            return userRepository.findByUsernameIgnoreCase(username)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    }

    private UserProfileResponseDto mapToDto(User user) {
        Optional<Order> lastOrder = orderRepository.findTopByUserUserIdOrderByOrderDateDesc(user.getUserId());
        long totalOrders = orderRepository.countByUserUserId(user.getUserId());
        String fullName = buildFullName(user.getFirstName(), user.getLastName());

        return UserProfileResponseDto.builder()
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(fullName)
                .email(user.getEmail())
                .username(user.getUsername())
                .phone(user.getPhoneNumber())
                .company(user.getCompanyName())
                .addressLine1(user.getAddressLine1())
                .addressLine2(user.getAddressLine2())
                .city(user.getCity())
                .state(user.getState())
                .postalCode(user.getPostalCode())
                .country(user.getCountry())
                .registrationDate(user.getRegistrationDate())
                .totalOrders(totalOrders)
                .lastOrderDate(lastOrder.map(Order::getOrderDate).orElse(null))
                .build();
    }

    private String buildFullName(String firstName, String lastName) {
        return ((firstName == null ? "" : firstName.trim()) + " " + (lastName == null ? "" : lastName.trim())).trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeCountryName(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }

        return switch (normalized.trim().toUpperCase(java.util.Locale.ROOT)) {
            case "FR", "FRA", "FRANCE" -> "France";
            case "TN", "TUN", "TUNISIA", "TUNISIE" -> "Tunisia";
            case "US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA", "ETATS-UNIS", "ÉTATS-UNIS" -> "United States";
            case "GB", "UK", "UNITED KINGDOM", "ROYAUME-UNI" -> "United Kingdom";
            case "DE", "GERMANY", "ALLEMAGNE" -> "Germany";
            case "IT", "ITALY", "ITALIE" -> "Italy";
            case "ES", "SPAIN", "ESPAGNE" -> "Spain";
            case "BE", "BELGIUM", "BELGIQUE" -> "Belgium";
            case "NL", "NETHERLANDS", "PAYS-BAS" -> "Netherlands";
            case "PT", "PORTUGAL" -> "Portugal";
            case "CH", "SWITZERLAND", "SUISSE" -> "Switzerland";
            case "CA", "CANADA" -> "Canada";
            default -> normalized;
        };
    }

    private String normalizeCountryCode(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }

        return switch (normalized.trim().toUpperCase(java.util.Locale.ROOT)) {
            case "FR", "FRA", "FRANCE" -> "FR";
            case "TN", "TUN", "TUNISIA", "TUNISIE" -> "TN";
            case "US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA", "ETATS-UNIS", "ÉTATS-UNIS" -> "US";
            case "GB", "UK", "UNITED KINGDOM", "ROYAUME-UNI" -> "GB";
            case "DE", "GERMANY", "ALLEMAGNE" -> "DE";
            case "IT", "ITALY", "ITALIE" -> "IT";
            case "ES", "SPAIN", "ESPAGNE" -> "ES";
            case "BE", "BELGIUM", "BELGIQUE" -> "BE";
            case "NL", "NETHERLANDS", "PAYS-BAS" -> "NL";
            case "PT", "PORTUGAL" -> "PT";
            case "CH", "SWITZERLAND", "SUISSE" -> "CH";
            case "CA", "CANADA" -> "CA";
            default -> normalized.trim().toUpperCase(java.util.Locale.ROOT);
        };
    }
}
