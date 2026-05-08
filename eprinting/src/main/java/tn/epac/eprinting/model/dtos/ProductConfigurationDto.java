package tn.epac.eprinting.model.dtos;


public class ProductConfigurationDto {
    private Integer quantity;
    private Integer productionPage;
    private Double height;
    private Double thickness;
    private Double width;

    private Integer securityLabel;
    private Integer hasCoil;
    private Integer hasInsert;
    private Integer hasTab;
    private Integer hasBackcover;
    private Integer perf;
    private Integer doubleSidedCover;
    private Integer shrinkwrap;
    private Integer threeHoleDrill;

    private String textPaperType;
    private String textColor;
    private String coverPaperType;
    private String coverFinishType;
    private String coverColor;
    private String coverSize;
    private String priorityLevel;
    private String headAndTail;
    private String coilType;
    private String tabColor;
    private String insertPaperType;
    private String caseFinishType;
    private String spineType;
    private String labelType;

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Integer getProductionPage() { return productionPage; }
    public void setProductionPage(Integer productionPage) { this.productionPage = productionPage; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }

    public Double getThickness() { return thickness; }
    public void setThickness(Double thickness) { this.thickness = thickness; }

    public Double getWidth() { return width; }
    public void setWidth(Double width) { this.width = width; }

    public Integer getSecurityLabel() { return securityLabel; }
    public void setSecurityLabel(Integer securityLabel) { this.securityLabel = securityLabel; }

    public Integer getHasCoil() { return hasCoil; }
    public void setHasCoil(Integer hasCoil) { this.hasCoil = hasCoil; }

    public Integer getHasInsert() { return hasInsert; }
    public void setHasInsert(Integer hasInsert) { this.hasInsert = hasInsert; }

    public Integer getHasTab() { return hasTab; }
    public void setHasTab(Integer hasTab) { this.hasTab = hasTab; }

    public Integer getHasBackcover() { return hasBackcover; }
    public void setHasBackcover(Integer hasBackcover) { this.hasBackcover = hasBackcover; }

    public Integer getPerf() { return perf; }
    public void setPerf(Integer perf) { this.perf = perf; }

    public Integer getDoubleSidedCover() { return doubleSidedCover; }
    public void setDoubleSidedCover(Integer doubleSidedCover) { this.doubleSidedCover = doubleSidedCover; }

    public Integer getShrinkwrap() { return shrinkwrap; }
    public void setShrinkwrap(Integer shrinkwrap) { this.shrinkwrap = shrinkwrap; }

    public Integer getThreeHoleDrill() { return threeHoleDrill; }
    public void setThreeHoleDrill(Integer threeHoleDrill) { this.threeHoleDrill = threeHoleDrill; }

    public String getTextPaperType() { return textPaperType; }
    public void setTextPaperType(String textPaperType) { this.textPaperType = textPaperType; }

    public String getTextColor() { return textColor; }
    public void setTextColor(String textColor) { this.textColor = textColor; }

    public String getCoverPaperType() { return coverPaperType; }
    public void setCoverPaperType(String coverPaperType) { this.coverPaperType = coverPaperType; }

    public String getCoverFinishType() { return coverFinishType; }
    public void setCoverFinishType(String coverFinishType) { this.coverFinishType = coverFinishType; }

    public String getCoverColor() { return coverColor; }
    public void setCoverColor(String coverColor) { this.coverColor = coverColor; }

    public String getCoverSize() { return coverSize; }
    public void setCoverSize(String coverSize) { this.coverSize = coverSize; }

    public String getPriorityLevel() { return priorityLevel; }
    public void setPriorityLevel(String priorityLevel) { this.priorityLevel = priorityLevel; }

    public String getHeadAndTail() { return headAndTail; }
    public void setHeadAndTail(String headAndTail) { this.headAndTail = headAndTail; }

    public String getCoilType() { return coilType; }
    public void setCoilType(String coilType) { this.coilType = coilType; }

    public String getTabColor() { return tabColor; }
    public void setTabColor(String tabColor) { this.tabColor = tabColor; }

    public String getInsertPaperType() { return insertPaperType; }
    public void setInsertPaperType(String insertPaperType) { this.insertPaperType = insertPaperType; }

    public String getCaseFinishType() { return caseFinishType; }
    public void setCaseFinishType(String caseFinishType) { this.caseFinishType = caseFinishType; }

    public String getSpineType() { return spineType; }
    public void setSpineType(String spineType) { this.spineType = spineType; }

    public String getLabelType() { return labelType; }
    public void setLabelType(String labelType) { this.labelType = labelType; }
}
