package tn.epac.eprinting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.model.dtos.AdminUserCreateRequestDto;
import tn.epac.eprinting.model.dtos.AdminUserOrdersDetailsDto;
import tn.epac.eprinting.model.dtos.AdminUserResponseDto;
import tn.epac.eprinting.model.dtos.AdminUserRoleUpdateRequestDto;
import tn.epac.eprinting.model.dtos.AdminUserUpdateRequestDto;
import tn.epac.eprinting.serviceimpl.AdminUserServiceImpl;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
public class AdminUserController {

    private final AdminUserServiceImpl adminUserService;

    @GetMapping
    public ResponseEntity<List<AdminUserResponseDto>> getUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<AdminUserResponseDto> createUser(@Valid @RequestBody AdminUserCreateRequestDto request) {
        return ResponseEntity.ok(adminUserService.createUser(request));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<AdminUserResponseDto> updateUser(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserUpdateRequestDto request
    ) {
        return ResponseEntity.ok(adminUserService.updateUser(userId, request));
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<AdminUserResponseDto> updateRole(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserRoleUpdateRequestDto request
    ) {
        return ResponseEntity.ok(adminUserService.updateRole(userId, request));
    }

    @GetMapping("/{userId}/orders")
    public ResponseEntity<AdminUserOrdersDetailsDto> getUserOrders(@PathVariable Long userId) {
        return ResponseEntity.ok(adminUserService.getUserOrdersDetails(userId));
    }
}
