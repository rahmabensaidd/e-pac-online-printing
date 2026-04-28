package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.epac.eprinting.model.enums.AdminBookStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookResponseDto {
    private Long bookId;
    private String title;
    private String description;
    private Integer productionPage;
    private Float salePrice;

    private Integer quantity;
    private Integer height;
    private Integer thickness;
    private Integer width;
    private Boolean securityLabel;
    private Boolean hasCoil;
    private Boolean hasInsert;
    private Boolean hasTab;
    private Boolean hasBackcover;
    private Boolean perf;
    private Boolean doubleSidedCover;
    private Boolean shrinkwrap;
    private Boolean threeHoleDrill;
    private Boolean pnlCover;
    private Boolean pnlText;

    private String textPaperType;
    private String textColor;
    private String coverFinishType;
    private String coverColor;
    private String coverSize;
    private String coverPaperType;
    private String headAndTail;
    private String priorityLevel;
    private String bindingType;
    private String coilType;
    private String tabColor;
    private String insertPaperType;
    private String caseFinishType;
    private String spineType;
    private String labelType;
    private String siren;
    private String[] authors;
    private Long creationAuthorUserId;
    private String creationAuthorFullName;
    private String creationAuthorEmail;
    private LocalDateTime creationDate;
    private LocalDateTime updatedAt;

    private Boolean isAddedFromAdmin;
    private Boolean isCreatedByUser;
    private AdminBookStatus stockStatus;

    private CoverPayloadDto cover;
    private ContentPayloadDto content;
    private List<PnlInformationPayloadDto> pnlInformations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoverPayloadDto {
        private Long coverId;
        private String title;
        private String barcodeId;
        private List<String> images;
        private List<String> texts;
        private String pdfFileName;
        private String pdfFileType;
        private String pdfFilePath;
        private Long coverTemplateId;
        private String coverTemplateThumbnailUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentPayloadDto {
        private Long contentId;
        private String textContent;
        private String fileName;
        private String fileType;
        private String filePath;
        private Long textTemplateId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PnlInformationPayloadDto {
        private Long id;
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
        private Long id;
        private Integer lineId;
        private Integer ordering;
        private String value;
        private String pnlFontType;
        private Integer pnlFontSize;
        private Boolean pnlFontBold;
        private Boolean pnlFontItalic;
    }
}
