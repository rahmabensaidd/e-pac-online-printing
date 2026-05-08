package tn.epac.eprinting.serviceimpl;

import org.springframework.stereotype.Service;
import tn.epac.eprinting.client.PricingCopilotClient;
import tn.epac.eprinting.model.dtos.CopilotInterpretationRequestDto;
import tn.epac.eprinting.model.dtos.CopilotInterpretationResponseDto;
import tn.epac.eprinting.model.dtos.CopilotPricingAnalyzeRequestDto;
import tn.epac.eprinting.model.dtos.CopilotPricingAnalyzeResponseDto;
import tn.epac.eprinting.model.dtos.ExplainedQuoteResponseDto;
import tn.epac.eprinting.model.dtos.PricingApiRequestDto;
import tn.epac.eprinting.model.dtos.PricingRequestMapper;
import tn.epac.eprinting.model.dtos.ProductConfigurationDto;
import tn.epac.eprinting.model.dtos.QuoteRequestDto;

import java.util.ArrayList;
import java.util.List;

@Service
public class PricingCopilotService {

    private final PricingCopilotClient pricingCopilotClient;
    private final PricingRequestMapper pricingRequestMapper;

    public PricingCopilotService(PricingCopilotClient pricingCopilotClient,
                                 PricingRequestMapper pricingRequestMapper) {
        this.pricingCopilotClient = pricingCopilotClient;
        this.pricingRequestMapper = pricingRequestMapper;
    }

    public CopilotPricingAnalyzeResponseDto analyze(CopilotPricingAnalyzeRequestDto request) {
        String selectedQuestion = normalizeSelectedQuestion(request.getSelectedQuestion());

        QuoteRequestDto quoteRequest = toQuoteRequest(request);
        CopilotInterpretationRequestDto interpretationRequest = new CopilotInterpretationRequestDto();
        interpretationRequest.setSelectedQuestion(selectedQuestion);
        interpretationRequest.setQuoteRequest(quoteRequest);
        interpretationRequest.setPricingApiRequest(toPricingApiRequest(quoteRequest));
        interpretationRequest.setConversationHistory(request.getConversationHistory());

        try {
            return pricingCopilotClient.analyze(interpretationRequest);
        } catch (Exception ex) {
            return buildFallbackAnalyzeResponse(selectedQuestion);
        }
    }

    private QuoteRequestDto toQuoteRequest(CopilotPricingAnalyzeRequestDto request) {
        validateRequiredFields(request);

        QuoteRequestDto quoteRequest = new QuoteRequestDto();
        quoteRequest.setSiren(request.getSiren());
        quoteRequest.setBindingType(request.getBindingType());
        quoteRequest.setProduct(request.getProduct());
        return quoteRequest;
    }

    private PricingApiRequestDto toPricingApiRequest(QuoteRequestDto quoteRequest) {
        return pricingRequestMapper.toPricingApiRequest(quoteRequest);
    }

    private void validateRequiredFields(CopilotPricingAnalyzeRequestDto request) {
        List<String> missingFields = new ArrayList<>();
        if (isBlank(request.getSiren())) missingFields.add("siren");
        if (isBlank(request.getBindingType())) missingFields.add("bindingType");

        ProductConfigurationDto product = request.getProduct();
        if (product == null) {
            missingFields.add("product");
        } else {
            if (product.getQuantity() == null) missingFields.add("product.quantity");
            if (product.getProductionPage() == null) missingFields.add("product.productionPage");
            if (product.getHeight() == null) missingFields.add("product.height");
            if (product.getWidth() == null) missingFields.add("product.width");
            if (product.getThickness() == null) missingFields.add("product.thickness");
            if (isBlank(product.getTextPaperType())) missingFields.add("product.textPaperType");
            if (isBlank(product.getTextColor())) missingFields.add("product.textColor");
            if (isBlank(product.getCoverPaperType())) missingFields.add("product.coverPaperType");
            if (isBlank(product.getCoverFinishType())) missingFields.add("product.coverFinishType");
            if (isBlank(product.getCoverColor())) missingFields.add("product.coverColor");
            if (isBlank(product.getPriorityLevel())) missingFields.add("product.priorityLevel");
            if (isBlank(product.getHeadAndTail())) missingFields.add("product.headAndTail");
        }

        if (!missingFields.isEmpty()) {
            throw new IllegalArgumentException("Missing required copilot fields: " + String.join(", ", missingFields));
        }
    }

    private String normalizeSelectedQuestion(String selectedQuestion) {
        if (selectedQuestion == null || selectedQuestion.isBlank()) {
            return "Why this price?";
        }
        String normalized = selectedQuestion.trim();
        if (normalized.equalsIgnoreCase("Pourquoi ce prix ?")) return "Why this price?";
        if (normalized.equalsIgnoreCase("Quel driver influence le plus le prix ?")) {
            return "Which driver influences the price the most?";
        }
        if (normalized.equalsIgnoreCase("Quelle action recommandez-vous ?")) {
            return "What action do you recommend?";
        }
        return normalized;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private CopilotPricingAnalyzeResponseDto buildFallbackAnalyzeResponse(String selectedQuestion) {
        CopilotInterpretationResponseDto fallback = new CopilotInterpretationResponseDto();
        fallback.setSelectedModel(null);
        fallback.setRecommendedPrice(null);
        fallback.setConfidence("LOW");
        fallback.setRecommendedAction("REVIEW");
        fallback.setAnswer(
                "The AI service is currently unavailable. "
                        + "Received question: " + selectedQuestion + ". "
                        + "You can use the current pricing result and retry the AI analysis later."
        );
        ExplainedQuoteResponseDto pricing = new ExplainedQuoteResponseDto();
        pricing.setAvailable(false);
        pricing.setSelectedPrice(null);
        pricing.setSelectedModel(null);
        pricing.setSelectedStrategy(null);
        pricing.setPricingDetails(java.util.Map.of());
        pricing.setMessage("Pricing copilot service unavailable");

        CopilotPricingAnalyzeResponseDto response = new CopilotPricingAnalyzeResponseDto();
        response.setSelectedQuestion(selectedQuestion);
        response.setPricing(pricing);
        response.setCopilot(fallback);
        return response;
    }

}
