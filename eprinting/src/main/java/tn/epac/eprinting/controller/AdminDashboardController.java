package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.model.dtos.AdminDashboardResponseDto;
import tn.epac.eprinting.serviceimpl.AdminDashboardServiceImpl;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
public class AdminDashboardController {

    private final AdminDashboardServiceImpl adminDashboardService;

    @GetMapping
    public ResponseEntity<AdminDashboardResponseDto> getDashboard() {
        return ResponseEntity.ok(adminDashboardService.getDashboard());
    }
}
