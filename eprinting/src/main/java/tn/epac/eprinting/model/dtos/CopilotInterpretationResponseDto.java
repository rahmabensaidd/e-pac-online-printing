package tn.epac.eprinting.model.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CopilotInterpretationResponseDto {
    private String answer;

    @JsonProperty("selected_model")
    private String selectedModel;

    @JsonProperty("recommended_price")
    private Double recommendedPrice;

    private String confidence;

    @JsonProperty("recommended_action")
    private String recommendedAction;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getSelectedModel() {
        return selectedModel;
    }

    public void setSelectedModel(String selectedModel) {
        this.selectedModel = selectedModel;
    }

    public Double getRecommendedPrice() {
        return recommendedPrice;
    }

    public void setRecommendedPrice(Double recommendedPrice) {
        this.recommendedPrice = recommendedPrice;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public String getRecommendedAction() {
        return recommendedAction;
    }

    public void setRecommendedAction(String recommendedAction) {
        this.recommendedAction = recommendedAction;
    }
}
