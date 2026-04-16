package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.CoverTemplateDraftRequestDto;
import tn.epac.eprinting.model.dtos.CoverTemplateResponseDto;
import tn.epac.eprinting.model.dtos.CoverTemplateUsageDto;
import tn.epac.eprinting.model.entities.CoverTemplate;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.repository.CoverRepository;
import tn.epac.eprinting.repository.CoverTemplateRepository;
import tn.epac.eprinting.repository.UserRepository;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class CoverTemplateServiceImpl {

    private static final String DRAFT_STATUS = "DRAFT";
    private static final String MY_TEMPLATE_STATUS = "MY_TEMPLATE";
    private static final String PUBLISHED_STATUS = "PUBLISHED";
    private static final String ARCHIVED_STATUS = "ARCHIVED";

    private final CoverTemplateRepository coverTemplateRepository;
    private final CoverRepository coverRepository;
    private final UserRepository userRepository;

    public CoverTemplateResponseDto saveDraft(Long userId, CoverTemplateDraftRequestDto request, Jwt jwt) {
        ensureCanAccessUserDrafts(userId, jwt);

        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        CoverTemplate template;
        if (request.getTemplateId() != null) {
            template = coverTemplateRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
            ensureCanEditTemplate(template, jwt);
        } else {
            template = new CoverTemplate();
            template.setCreationAuthor(author);
            template.setCreatedByAdmin(isAdmin(jwt));
            template.setActive(Boolean.TRUE);
            template.setVersion(1);
        }

        template.setName(request.getName().trim());
        template.setDescription(trimToNull(request.getDescription()));
        template.setFamily(request.getFamily().trim());
        template.setSourceBlankCode(request.getSourceBlankCode().trim());
        template.setSceneString(request.getSceneString());
        template.setThumbnailUrl(trimToNull(request.getThumbnailUrl()));
        template.setMetadataJson(trimToNull(request.getMetadataJson()));
        template.setStatus(DRAFT_STATUS);

        if (template.getTemplateId() != null) {
            int currentVersion = template.getVersion() == null ? 1 : template.getVersion();
            template.setVersion(currentVersion + 1);
        }

        CoverTemplate saved = coverTemplateRepository.save(template);
        return toDto(saved);
    }

    public CoverTemplateResponseDto saveMyTemplate(Long userId, CoverTemplateDraftRequestDto request, Jwt jwt) {
        ensureCanAccessUserDrafts(userId, jwt);

        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        CoverTemplate template = new CoverTemplate();
        template.setCreationAuthor(author);
        template.setCreatedByAdmin(Boolean.FALSE);
        template.setActive(Boolean.TRUE);
        template.setVersion(1);

        template.setName(request.getName().trim());
        template.setDescription(trimToNull(request.getDescription()));
        template.setFamily(request.getFamily().trim());
        template.setSourceBlankCode(request.getSourceBlankCode().trim());
        template.setSceneString(request.getSceneString());
        template.setThumbnailUrl(trimToNull(request.getThumbnailUrl()));
        template.setMetadataJson(trimToNull(request.getMetadataJson()));
        template.setStatus(MY_TEMPLATE_STATUS);

        CoverTemplate saved = coverTemplateRepository.save(template);
        return toDto(saved);
    }

    public CoverTemplateResponseDto saveChanges(Long templateId, CoverTemplateDraftRequestDto request, Jwt jwt) {
        CoverTemplate template = coverTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));

        ensureCanEditTemplate(template, jwt);
        ensureTemplateNotLinkedToAnyBook(templateId);

        template.setName(request.getName().trim());
        template.setDescription(trimToNull(request.getDescription()));
        template.setFamily(request.getFamily().trim());
        template.setSourceBlankCode(request.getSourceBlankCode().trim());
        template.setSceneString(request.getSceneString());
        template.setThumbnailUrl(trimToNull(request.getThumbnailUrl()));
        template.setMetadataJson(trimToNull(request.getMetadataJson()));

        int currentVersion = template.getVersion() == null ? 1 : template.getVersion();
        template.setVersion(currentVersion + 1);

        CoverTemplate saved = coverTemplateRepository.save(template);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public CoverTemplateUsageDto getTemplateUsage(Long templateId, Jwt jwt) {
        CoverTemplate template = coverTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));

        long linkedBooksCount = coverRepository.countByCoverTemplate_TemplateId(templateId);
        boolean linkedToBooks = linkedBooksCount > 0;

        Long authorId = template.getCreationAuthor() != null ? template.getCreationAuthor().getUserId() : null;
        long tokenUserId = extractUserId(jwt);
        boolean canOverwrite = !linkedToBooks && (isAdmin(jwt) || Objects.equals(authorId, tokenUserId));

        return CoverTemplateUsageDto.builder()
                .templateId(templateId)
                .linkedToBooks(linkedToBooks)
                .linkedBooksCount(linkedBooksCount)
                .canOverwrite(canOverwrite)
                .build();
    }

    public CoverTemplateResponseDto publish(Long templateId, Jwt jwt) {
        if (!isAdmin(jwt)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can publish templates");
        }

        CoverTemplate template = coverTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));

        ensureCanEditTemplate(template, jwt);

        template.setStatus(PUBLISHED_STATUS);
        template.setCreatedByAdmin(Boolean.TRUE);
        int currentVersion = template.getVersion() == null ? 1 : template.getVersion();
        template.setVersion(currentVersion + 1);

        CoverTemplate saved = coverTemplateRepository.save(template);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<CoverTemplateResponseDto> getDraftsByUser(Long userId, Jwt jwt) {
        ensureCanAccessUserDrafts(userId, jwt);

        return coverTemplateRepository
                .findByCreationAuthor_UserIdAndStatusAndActiveTrueOrderByUpdatedAtDesc(userId, DRAFT_STATUS)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoverTemplateResponseDto> getPublished() {
        return coverTemplateRepository
                .findByStatusAndActiveTrueOrderByUpdatedAtDesc(PUBLISHED_STATUS)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoverTemplateResponseDto> getMyTemplates(Long userId, Jwt jwt) {
        ensureCanAccessUserDrafts(userId, jwt);

        return coverTemplateRepository
                .findByCreationAuthor_UserIdAndActiveTrueOrderByUpdatedAtDesc(userId)
                .stream()
                .filter(template -> template.getStatus() != null)
                .filter(template -> !PUBLISHED_STATUS.equalsIgnoreCase(template.getStatus()))
                .filter(template -> !ARCHIVED_STATUS.equalsIgnoreCase(template.getStatus()))
                .map(this::toDto)
                .toList();
    }

    private CoverTemplateResponseDto toDto(CoverTemplate template) {
        Long authorId = template.getCreationAuthor() != null ? template.getCreationAuthor().getUserId() : null;
        return CoverTemplateResponseDto.builder()
                .templateId(template.getTemplateId())
                .name(template.getName())
                .description(template.getDescription())
                .family(template.getFamily())
                .sourceBlankCode(template.getSourceBlankCode())
                .status(template.getStatus())
                .sceneString(template.getSceneString())
                .thumbnailUrl(template.getThumbnailUrl())
                .metadataJson(template.getMetadataJson())
                .createdByAdmin(template.getCreatedByAdmin())
                .active(template.getActive())
                .version(template.getVersion())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .creationAuthorId(authorId)
                .build();
    }

    private void ensureCanAccessUserDrafts(Long userId, Jwt jwt) {
        long tokenUserId = extractUserId(jwt);
        if (!isAdmin(jwt) && !Objects.equals(userId, tokenUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own drafts");
        }
    }

    private void ensureCanEditTemplate(CoverTemplate template, Jwt jwt) {
        if (isAdmin(jwt)) {
            return;
        }

        long tokenUserId = extractUserId(jwt);
        Long authorId = template.getCreationAuthor() != null ? template.getCreationAuthor().getUserId() : null;
        if (!Objects.equals(authorId, tokenUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to modify this template");
        }
    }

    private long extractUserId(Jwt jwt) {
        Object claim = jwt.getClaim("user_id");
        if (claim instanceof Number numberClaim) {
            return numberClaim.longValue();
        }

        if (claim instanceof String stringClaim && !stringClaim.isBlank()) {
            try {
                return Long.parseLong(stringClaim);
            } catch (NumberFormatException ignored) {
                // handled below
            }
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token: user_id claim not found");
    }

    private boolean isAdmin(Jwt jwt) {
        Object claim = jwt.getClaim("roles");
        if (!(claim instanceof Collection<?> roles)) {
            return false;
        }

        return roles.stream()
                .map(String::valueOf)
                .anyMatch(role -> "admin".equalsIgnoreCase(role));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void ensureTemplateNotLinkedToAnyBook(Long templateId) {
        long linkedBooksCount = coverRepository.countByCoverTemplate_TemplateId(templateId);
        if (linkedBooksCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This template is already linked to existing books. Create a new template instance instead."
            );
        }
    }
}
