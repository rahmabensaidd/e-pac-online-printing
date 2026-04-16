package tn.epac.eprinting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.model.dtos.CoverTemplateDraftRequestDto;
import tn.epac.eprinting.model.dtos.CoverTemplateResponseDto;
import tn.epac.eprinting.model.dtos.CoverTemplateUsageDto;
import tn.epac.eprinting.serviceimpl.CoverTemplateServiceImpl;

import java.util.List;

@RestController
@RequestMapping("/api/cover-templates")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('admin','user','organization')")
public class CoverTemplateController {

    private final CoverTemplateServiceImpl coverTemplateService;

    @PostMapping("/drafts/{userId}")
    public ResponseEntity<CoverTemplateResponseDto> saveDraft(
            @PathVariable Long userId,
            @Valid @RequestBody CoverTemplateDraftRequestDto request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(coverTemplateService.saveDraft(userId, request, jwt));
    }

    @PostMapping("/{templateId}/publish")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<CoverTemplateResponseDto> publish(
            @PathVariable Long templateId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(coverTemplateService.publish(templateId, jwt));
    }

    @GetMapping("/drafts/user/{userId}")
    public ResponseEntity<List<CoverTemplateResponseDto>> getDraftsByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(coverTemplateService.getDraftsByUser(userId, jwt));
    }

    @GetMapping("/published")
    public ResponseEntity<List<CoverTemplateResponseDto>> getPublished() {
        return ResponseEntity.ok(coverTemplateService.getPublished());
    }

    @GetMapping("/my/{userId}")
    public ResponseEntity<List<CoverTemplateResponseDto>> getMyTemplates(
            @PathVariable Long userId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(coverTemplateService.getMyTemplates(userId, jwt));
    }

    @PostMapping("/my/{userId}")
    public ResponseEntity<CoverTemplateResponseDto> saveMyTemplate(
            @PathVariable Long userId,
            @Valid @RequestBody CoverTemplateDraftRequestDto request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(coverTemplateService.saveMyTemplate(userId, request, jwt));
    }

    @PutMapping("/{templateId}")
    public ResponseEntity<CoverTemplateResponseDto> saveChanges(
            @PathVariable Long templateId,
            @Valid @RequestBody CoverTemplateDraftRequestDto request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(coverTemplateService.saveChanges(templateId, request, jwt));
    }

    @GetMapping("/{templateId}/usage")
    public ResponseEntity<CoverTemplateUsageDto> getTemplateUsage(
            @PathVariable Long templateId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(coverTemplateService.getTemplateUsage(templateId, jwt));
    }
}
