package tn.epac.eprinting.model.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CopilotInterpretationRequestDto {
    @JsonProperty("pricing_response")
    private Object pricingResponse;

    @JsonProperty("selected_question")
    private String selectedQuestion;

    @JsonProperty("quote_request")
    private QuoteRequestDto quoteRequest;

    @JsonProperty("pricing_api_request")
    private PricingApiRequestDto pricingApiRequest;

    @JsonProperty("selected_strategy")
    private String selectedStrategy;

    @JsonProperty("selected_model")
    private String selectedModel;

    @JsonProperty("selected_price")
    private Double selectedPrice;

    @JsonProperty("pricing_explanation")
    private PricingExplanationDto pricingExplanation;

    @JsonProperty("conversation_history")
    private java.util.List<CopilotConversationTurnDto> conversationHistory;

    public Object getPricingResponse() {
        return pricingResponse;
    }

    public void setPricingResponse(Object pricingResponse) {
        this.pricingResponse = pricingResponse;
    }

    public String getSelectedQuestion() {
        return selectedQuestion;
    }

    public void setSelectedQuestion(String selectedQuestion) {
        this.selectedQuestion = selectedQuestion;
    }

    public QuoteRequestDto getQuoteRequest() {
        return quoteRequest;
    }

    public void setQuoteRequest(QuoteRequestDto quoteRequest) {
        this.quoteRequest = quoteRequest;
    }

    public PricingApiRequestDto getPricingApiRequest() {
        return pricingApiRequest;
    }

    public void setPricingApiRequest(PricingApiRequestDto pricingApiRequest) {
        this.pricingApiRequest = pricingApiRequest;
    }

    public String getSelectedStrategy() {
        return selectedStrategy;
    }

    public void setSelectedStrategy(String selectedStrategy) {
        this.selectedStrategy = selectedStrategy;
    }

    public String getSelectedModel() {
        return selectedModel;
    }

    public void setSelectedModel(String selectedModel) {
        this.selectedModel = selectedModel;
    }

    public Double getSelectedPrice() {
        return selectedPrice;
    }

    public void setSelectedPrice(Double selectedPrice) {
        this.selectedPrice = selectedPrice;
    }

    public PricingExplanationDto getPricingExplanation() {
        return pricingExplanation;
    }

    public void setPricingExplanation(PricingExplanationDto pricingExplanation) {
        this.pricingExplanation = pricingExplanation;
    }

    public java.util.List<CopilotConversationTurnDto> getConversationHistory() {
        return conversationHistory;
    }

    public void setConversationHistory(java.util.List<CopilotConversationTurnDto> conversationHistory) {
        this.conversationHistory = conversationHistory;
    }
}
