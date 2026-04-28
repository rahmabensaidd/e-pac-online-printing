package tn.epac.eprinting.model.dtos;

public class ExplainedQuoteResponseDto extends QuoteResponseDto {
    private String requestId;
    private String timestamp;
    private Object input;
    private PricingExplanationDto explanation;

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public Object getInput() {
        return input;
    }

    public void setInput(Object input) {
        this.input = input;
    }

    public PricingExplanationDto getExplanation() {
        return explanation;
    }

    public void setExplanation(PricingExplanationDto explanation) {
        this.explanation = explanation;
    }
}
