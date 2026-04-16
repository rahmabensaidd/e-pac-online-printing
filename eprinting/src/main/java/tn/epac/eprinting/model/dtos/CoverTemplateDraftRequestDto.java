package tn.epac.eprinting.model.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CoverTemplateDraftRequestDto {
    private Long templateId;

    @NotBlank
    private String name;

    private String description;

    @NotBlank
    private String family;

    @NotBlank
    private String sourceBlankCode;

    @NotBlank
    private String sceneString;

    private String thumbnailUrl;

    private String metadataJson;
}
