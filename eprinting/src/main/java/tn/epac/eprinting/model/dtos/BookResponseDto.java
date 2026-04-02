package tn.epac.eprinting.model.dtos;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.epac.eprinting.model.enums.AdminBookStatus;

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

    // Numerical fields
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

    // Categorical fields
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

    // Status
    private AdminBookStatus stockStatus;
}
