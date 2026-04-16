package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CoverTemplateUsageDto {
    private Long templateId;
    private boolean linkedToBooks;
    private long linkedBooksCount;
    private boolean canOverwrite;
}
