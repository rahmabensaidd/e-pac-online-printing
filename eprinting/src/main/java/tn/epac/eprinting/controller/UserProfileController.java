package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.model.dtos.UserProfileResponseDto;
import tn.epac.eprinting.model.dtos.UserProfileUpdateRequestDto;
import tn.epac.eprinting.serviceimpl.UserProfileService;

@RestController
@RequestMapping("/api/user/profile")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('user','admin','organization')")
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<UserProfileResponseDto> getCurrentProfile(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(userProfileService.getCurrentProfile(jwt));
    }

    @PutMapping
    public ResponseEntity<UserProfileResponseDto> updateCurrentProfile(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody UserProfileUpdateRequestDto request
    ) {
        return ResponseEntity.ok(userProfileService.updateCurrentProfile(jwt, request));
    }
}
