package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.AdminUserCreateRequestDto;
import tn.epac.eprinting.model.dtos.AdminUserOrderSummaryDto;
import tn.epac.eprinting.model.dtos.AdminUserOrdersDetailsDto;
import tn.epac.eprinting.model.dtos.AdminUserResponseDto;
import tn.epac.eprinting.model.dtos.AdminUserRoleUpdateRequestDto;
import tn.epac.eprinting.model.dtos.AdminUserUpdateRequestDto;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.Role;
import tn.epac.eprinting.model.enums.UserType;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminUserServiceImpl {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    public List<AdminUserResponseDto> getAllUsers() {
        return userRepository.findAllByOrderByUserIdDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public AdminUserResponseDto createUser(AdminUserCreateRequestDto request) {
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
        user.setRole(parseRole(request.getRole()));
        user.setUserType(UserType.SIMPLE);
        user.setEnabled(Boolean.TRUE);
        user.setRegistrationDate(LocalDate.now());
        return toDto(userRepository.save(user));
    }

    public AdminUserResponseDto updateUser(Long userId, AdminUserUpdateRequestDto request) {
        User user = findUser(userId);
        String email = request.getEmail().trim().toLowerCase();
        String username = request.getUsername().trim();

        userRepository.findByEmail(email)
                .filter(existing -> !existing.getUserId().equals(userId))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
                });
        userRepository.findByUsernameIgnoreCase(username)
                .filter(existing -> !existing.getUserId().equals(userId))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
                });

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(email);
        user.setUsername(username);
        if (request.getEnabled() != null) {
            user.setEnabled(request.getEnabled());
        }
        return toDto(userRepository.save(user));
    }

    public AdminUserResponseDto updateRole(Long userId, AdminUserRoleUpdateRequestDto request) {
        User user = findUser(userId);
        user.setRole(parseRole(request.getRole()));
        return toDto(userRepository.save(user));
    }

    public AdminUserOrdersDetailsDto getUserOrdersDetails(Long userId) {
        User user = findUser(userId);
        List<Order> orders = orderRepository.findByUserUserIdOrderByOrderDateDesc(userId);

        return AdminUserOrdersDetailsDto.builder()
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole() == null ? Role.USER.name() : user.getRole().name())
                .totalOrders((long) orders.size())
                .orders(orders.stream().map(this::toOrderSummaryDto).toList())
                .build();
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    private AdminUserResponseDto toDto(User user) {
        return AdminUserResponseDto.builder()
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole() == null ? Role.USER.name() : user.getRole().name())
                .enabled(user.getEnabled() == null ? Boolean.TRUE : user.getEnabled())
                .totalOrders(orderRepository.countByUserUserId(user.getUserId()))
                .build();
    }

    private AdminUserOrderSummaryDto toOrderSummaryDto(Order order) {
        return AdminUserOrderSummaryDto.builder()
                .orderId(order.getOrderId())
                .reference(order.getReference())
                .orderDate(order.getOrderDate())
                .status(order.getStatus())
                .priority(order.getPriority() == null ? "LOW" : order.getPriority().name())
                .totalAmount(BigDecimal.valueOf(order.getTotalAmount()))
                .items(order.getOrderLines() == null ? 0 : order.getOrderLines().size())
                .build();
    }

    private Role parseRole(String rawRole) {
        if (rawRole == null || rawRole.isBlank()) {
            return Role.USER;
        }
        try {
            return Role.valueOf(rawRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Role.USER;
        }
    }
}
