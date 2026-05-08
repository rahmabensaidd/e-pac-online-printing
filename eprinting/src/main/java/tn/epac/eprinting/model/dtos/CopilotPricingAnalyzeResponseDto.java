package tn.epac.eprinting.model.dtos;

public class CopilotPricingAnalyzeResponseDto {
    private String selectedQuestion;
    private ExplainedQuoteResponseDto pricing;
    private CopilotInterpretationResponseDto copilot;

    public String getSelectedQuestion() {
        return selectedQuestion;
    }

    public void setSelectedQuestion(String selectedQuestion) {
        this.selectedQuestion = selectedQuestion;
    }

    public ExplainedQuoteResponseDto getPricing() {
        return pricing;
    }

    public void setPricing(ExplainedQuoteResponseDto pricing) {
        this.pricing = pricing;
    }

    public CopilotInterpretationResponseDto getCopilot() {
        return copilot;
    }

    public void setCopilot(CopilotInterpretationResponseDto copilot) {
        this.copilot = copilot;
    }
}
