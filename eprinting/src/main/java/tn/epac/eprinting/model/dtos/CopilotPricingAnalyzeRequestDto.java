package tn.epac.eprinting.model.dtos;

public class CopilotPricingAnalyzeRequestDto {

    private String siren;
    private String bindingType;
    private ProductConfigurationDto product;
    private String selectedQuestion;
    private java.util.List<CopilotConversationTurnDto> conversationHistory;

    public String getSiren() {
        return siren;
    }

    public void setSiren(String siren) {
        this.siren = siren;
    }

    public String getBindingType() {
        return bindingType;
    }

    public void setBindingType(String bindingType) {
        this.bindingType = bindingType;
    }

    public ProductConfigurationDto getProduct() {
        return product;
    }

    public void setProduct(ProductConfigurationDto product) {
        this.product = product;
    }

    public String getSelectedQuestion() {
        return selectedQuestion;
    }

    public void setSelectedQuestion(String selectedQuestion) {
        this.selectedQuestion = selectedQuestion;
    }

    public java.util.List<CopilotConversationTurnDto> getConversationHistory() {
        return conversationHistory;
    }

    public void setConversationHistory(java.util.List<CopilotConversationTurnDto> conversationHistory) {
        this.conversationHistory = conversationHistory;
    }
}
