package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CoverTemplateResponseDto {
    private Long templateId;
    private String name;
    private String description;
    private String family;
    private String sourceBlankCode;
    private String status;
    private String sceneString;
    private String thumbnailUrl;
    private String metadataJson;
    private Boolean createdByAdmin;
    private Boolean active;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long creationAuthorId;
}
