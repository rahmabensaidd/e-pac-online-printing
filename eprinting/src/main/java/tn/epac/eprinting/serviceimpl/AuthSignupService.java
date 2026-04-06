package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.AuthLoginRequestDto;
import tn.epac.eprinting.model.dtos.AuthTokenResponseDto;
import tn.epac.eprinting.model.dtos.SignupRequestDto;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.repository.UserRepository;
import tn.epac.eprinting.security.JwtTokenService;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthSignupService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public void signup(SignupRequestDto request) {
        String email = request.getEmail().trim().toLowerCase();
        String username = request.getUsername().trim();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        User user = new User();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);
        user.setEnabled(Boolean.TRUE);
        user.setRegistrationDate(LocalDate.now());
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public AuthTokenResponseDto login(AuthLoginRequestDto request) {
        String identifier = request.getIdentifier().trim();
        User user = userRepository.findByEmail(identifier.toLowerCase())
                .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (Boolean.FALSE.equals(user.getEnabled())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account disabled");
        }
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Password not set for this account");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return AuthTokenResponseDto.builder()
                .accessToken(jwtTokenService.generateToken(user))
                .tokenType("Bearer")
                .expiresIn(jwtTokenService.getExpirationSeconds())
                .username(user.getUsername())
                .role((user.getRole() == null ? Role.USER.name() : user.getRole().name()).toLowerCase())
                .build();
    }
}
