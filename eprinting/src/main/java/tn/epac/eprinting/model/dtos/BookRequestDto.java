package tn.epac.eprinting.model.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookRequestDto {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @NotEmpty(message = "At least one author is required")
    private List<@NotBlank String> authors;

    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity must be greater than or equal to 0")
    private Integer quantity;

    @NotNull(message = "Page count is required")
    @Min(value = 1, message = "Page count must be at least 1")
    private Integer productionPage;

    @NotNull(message = "Height is required")
    @Positive(message = "Height must be positive")
    private Integer height;

    @NotNull(message = "Thickness is required")
    @Positive(message = "Thickness must be positive")
    private Integer thickness;

    @NotNull(message = "Width is required")
    @Positive(message = "Width must be positive")
    private Integer width;

    @NotNull(message = "Security label is required")
    private Boolean securityLabel;

    @NotNull(message = "Has coil is required")
    private Boolean hasCoil;

    @NotNull(message = "Has insert is required")
    private Boolean hasInsert;

    @NotNull(message = "Has tab is required")
    private Boolean hasTab;

    @NotNull(message = "Has backcover is required")
    private Boolean hasBackcover;

    @NotNull(message = "Perf is required")
    private Boolean perf;

    @NotNull(message = "Double sided cover is required")
    private Boolean doubleSidedCover;

    @NotNull(message = "Shrinkwrap is required")
    private Boolean shrinkwrap;

    @NotNull(message = "Three hole drill is required")
    private Boolean threeHoleDrill;

    @NotNull(message = "PNL cover flag is required")
    private Boolean pnlCover;

    @NotNull(message = "PNL text flag is required")
    private Boolean pnlText;

    @NotBlank(message = "Text paper type is required")
    private String textPaperType;

    @NotBlank(message = "Text color is required")
    private String textColor;

    @NotBlank(message = "Cover finish type is required")
    private String coverFinishType;

    @NotBlank(message = "Cover color is required")
    private String coverColor;

    @NotBlank(message = "Cover size is required")
    private String coverSize;

    @NotBlank(message = "Cover paper type is required")
    private String coverPaperType;

    @NotBlank(message = "Head and tail is required")
    private String headAndTail;

    @NotBlank(message = "Priority level is required")
    private String priorityLevel;

    @NotBlank(message = "Binding type is required")
    private String bindingType;

    private String coilType;
    private String tabColor;
    private String insertPaperType;
    private String caseFinishType;
    private String spineType;
    private String labelType;
    private String siren;

    @NotNull(message = "Sale price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Sale price must be greater than 0")
    private Float salePrice;

    @Valid
    private CoverPayloadDto cover;

    @Valid
    private ContentPayloadDto content;

    @Valid
    private List<PnlInformationPayloadDto> pnlInformations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoverPayloadDto {
        private String title;
        private String barcodeId;
        private List<String> images;
        private List<String> texts;
        private String pdfFileName;
        private String pdfFileType;
        private String pdfFilePath;
        private String pdfFileBase64;
        private Long coverTemplateId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentPayloadDto {
        private String textContent;
        private String fileName;
        private String fileType;
        private String filePath;
        private String fileBase64;
        private Long textTemplateId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PnlInformationPayloadDto {
        private Integer pnlPageNumber;
        private Integer pnlPrintingNumber;
        private Double pnlHorizontalMargin;
        private Double pnlVerticalMargin;
        private Integer pnlLineSpacing;
        private String pnlFontType;
        private Integer pnlFontSize;
        private Boolean pnlExcluded;
        private List<PnlLinePayloadDto> pnlLines;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PnlLinePayloadDto {
        private Integer lineId;
        private Integer ordering;
        private String value;
        private String pnlFontType;
        private Integer pnlFontSize;
        private Boolean pnlFontBold;
        private Boolean pnlFontItalic;
    }
}
