package tn.epac.eprinting.model.dtos;

import java.util.ArrayList;
import java.util.List;

public class PricingExplanationDto {
    private String selectedSourceKey;
    private String selectedSourceLabel;
    private String explanationType;
    private String formula;
    private Boolean shapAvailable;
    private String clientContext;
    private List<String> keyInsights = new ArrayList<>();
    private List<PricingDriverDto> topDrivers = new ArrayList<>();
    private List<PricingModelSummaryDto> modelSummaries = new ArrayList<>();

    public String getSelectedSourceKey() {
        return selectedSourceKey;
    }

    public void setSelectedSourceKey(String selectedSourceKey) {
        this.selectedSourceKey = selectedSourceKey;
    }

    public String getSelectedSourceLabel() {
        return selectedSourceLabel;
    }

    public void setSelectedSourceLabel(String selectedSourceLabel) {
        this.selectedSourceLabel = selectedSourceLabel;
    }

    public String getExplanationType() {
        return explanationType;
    }

    public void setExplanationType(String explanationType) {
        this.explanationType = explanationType;
    }

    public String getFormula() {
        return formula;
    }

    public void setFormula(String formula) {
        this.formula = formula;
    }

    public Boolean getShapAvailable() {
        return shapAvailable;
    }

    public void setShapAvailable(Boolean shapAvailable) {
        this.shapAvailable = shapAvailable;
    }

    public String getClientContext() {
        return clientContext;
    }

    public void setClientContext(String clientContext) {
        this.clientContext = clientContext;
    }

    public List<String> getKeyInsights() {
        return keyInsights;
    }

    public void setKeyInsights(List<String> keyInsights) {
        this.keyInsights = keyInsights;
    }

    public List<PricingDriverDto> getTopDrivers() {
        return topDrivers;
    }

    public void setTopDrivers(List<PricingDriverDto> topDrivers) {
        this.topDrivers = topDrivers;
    }

    public List<PricingModelSummaryDto> getModelSummaries() {
        return modelSummaries;
    }

    public void setModelSummaries(List<PricingModelSummaryDto> modelSummaries) {
        this.modelSummaries = modelSummaries;
    }
}
