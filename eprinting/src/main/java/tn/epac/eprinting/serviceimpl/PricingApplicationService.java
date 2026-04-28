package tn.epac.eprinting.serviceimpl;

import org.springframework.stereotype.Service;
import tn.epac.eprinting.model.dtos.ExplainedQuoteResponseDto;
import tn.epac.eprinting.model.dtos.PricingDriverDto;
import tn.epac.eprinting.model.dtos.PricingExplanationDto;
import tn.epac.eprinting.model.dtos.PricingModelSummaryDto;
import tn.epac.eprinting.client.PricingApiClient;
import tn.epac.eprinting.model.dtos.PricingApiRequestDto;
import tn.epac.eprinting.model.dtos.PricingRequestMapper;
import tn.epac.eprinting.model.dtos.QuoteRequestDto;
import tn.epac.eprinting.model.dtos.QuoteResponseDto;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PricingApplicationService {

    private final PricingRequestMapper pricingRequestMapper;
    private final PricingApiClient pricingApiClient;
    private final PricingSelectionService pricingSelectionService;

    public PricingApplicationService(PricingRequestMapper pricingRequestMapper,
                                     PricingApiClient pricingApiClient,
                                     PricingSelectionService pricingSelectionService) {
        this.pricingRequestMapper = pricingRequestMapper;
        this.pricingApiClient = pricingApiClient;
        this.pricingSelectionService = pricingSelectionService;
    }

    public QuoteResponseDto getQuote(QuoteRequestDto request) {
        PricingApiRequestDto pricingRequest = pricingRequestMapper.toPricingApiRequest(request);
        Map<String, Object> pricingResponse;
        try {
            pricingResponse = pricingApiClient.predict(pricingRequest);
        } catch (Exception ignored) {
            QuoteResponseDto response = new QuoteResponseDto();
            response.setAvailable(false);
            response.setSelectedPrice(null);
            response.setSelectedModel(null);
            response.setSelectedStrategy(null);
            response.setPricingDetails(Map.of());
            response.setMessage("Pricing service unavailable");
            return response;
        }

        SelectedPrediction selected =
                pricingSelectionService.selectBest(pricingResponse, request.getSiren());

        QuoteResponseDto response = new QuoteResponseDto();
        response.setPricingDetails(pricingResponse);

        if (selected == null) {
            response.setAvailable(false);
            response.setSelectedPrice(null);
            response.setSelectedModel(null);
            response.setSelectedStrategy(null);
            response.setMessage("No pricing model available for this configuration");
            return response;
        }

        response.setAvailable(true);
        response.setSelectedPrice(selected.getPrice());
        response.setSelectedModel(selected.getModelName());
        response.setSelectedStrategy(selected.getStrategy());
        response.setMessage("Pricing calculated successfully");

        return response;
    }

    public ExplainedQuoteResponseDto getExplainedQuote(QuoteRequestDto request) {
        QuoteResponseDto baseQuote = getQuote(request);

        ExplainedQuoteResponseDto response = new ExplainedQuoteResponseDto();
        response.setAvailable(baseQuote.isAvailable());
        response.setSelectedPrice(baseQuote.getSelectedPrice());
        response.setSelectedModel(baseQuote.getSelectedModel());
        response.setSelectedStrategy(baseQuote.getSelectedStrategy());
        response.setPricingDetails(baseQuote.getPricingDetails());
        response.setMessage(baseQuote.getMessage());

        if (!(baseQuote.getPricingDetails() instanceof Map<?, ?> rawPricingDetails)) {
            return response;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> pricingDetails = (Map<String, Object>) rawPricingDetails;
        response.setRequestId(readString(pricingDetails.get("request_id")));
        response.setTimestamp(readString(pricingDetails.get("timestamp")));
        response.setInput(pricingDetails.get("input"));
        response.setExplanation(buildExplanation(pricingDetails, baseQuote, request.getSiren()));
        return response;
    }

    private PricingExplanationDto buildExplanation(
            Map<String, Object> pricingDetails,
            QuoteResponseDto baseQuote,
            String siren
    ) {
        PricingExplanationDto explanation = new PricingExplanationDto();
        String selectedKey = resolveSelectedKey(baseQuote.getSelectedStrategy());
        explanation.setSelectedSourceKey(selectedKey);
        explanation.setSelectedSourceLabel(readLabel(pricingDetails, selectedKey));

        Map<String, Object> selectedBlock = getMap(pricingDetails.get(selectedKey));
        if (selectedBlock != null) {
            explanation.setFormula(readString(selectedBlock.get("formula")));
            explanation.setShapAvailable(readBoolean(selectedBlock.get("shap_available")));
            explanation.setExplanationType(resolveExplanationType(selectedBlock));
            explanation.setTopDrivers(extractTopDrivers(selectedBlock, 6));
        }

        explanation.setClientContext(buildClientContext(pricingDetails, siren));
        explanation.setKeyInsights(buildInsights(baseQuote, explanation, pricingDetails));
        explanation.setModelSummaries(buildModelSummaries(pricingDetails));
        return explanation;
    }

    private String resolveSelectedKey(String strategy) {
        if ("COUPLE_LINEAR".equalsIgnoreCase(strategy)) return "couple_linear";
        if ("FAMILY_LINEAR".equalsIgnoreCase(strategy)) return "family_linear";
        return "global_prediction";
    }

    private String readLabel(Map<String, Object> pricingDetails, String selectedKey) {
        Map<String, Object> selectedBlock = getMap(pricingDetails.get(selectedKey));
        if (selectedBlock == null) {
            return selectedKey;
        }

        String couple = readString(selectedBlock.get("couple"));
        if (couple != null) return couple;

        String family = readString(selectedBlock.get("family"));
        if (family != null) return family;

        String model = readString(selectedBlock.get("model_name"));
        return model != null ? model : selectedKey;
    }

    private String resolveExplanationType(Map<String, Object> predictionBlock) {
        String formula = readString(predictionBlock.get("formula"));
        if (formula != null && !formula.isBlank()) {
            return "FORMULA";
        }

        Boolean shapAvailable = readBoolean(predictionBlock.get("shap_available"));
        if (Boolean.TRUE.equals(shapAvailable)) {
            return "SHAP";
        }

        Object rawImportance = predictionBlock.get("feature_importance");
        if (rawImportance instanceof Map<?, ?>) {
            return "FEATURE_IMPORTANCE";
        }

        return "MODEL_SUMMARY";
    }

    private List<PricingDriverDto> extractTopDrivers(Map<String, Object> predictionBlock, int limit) {
        Object rawImportance = predictionBlock.get("feature_importance");
        if (!(rawImportance instanceof Map<?, ?> rawMap)) {
            return List.of();
        }

        Map<String, Object> featureImportance = new LinkedHashMap<>();
        rawMap.forEach((key, value) -> featureImportance.put(String.valueOf(key), value));

        return featureImportance.entrySet().stream()
                .filter(entry -> entry.getValue() instanceof Number)
                .map(entry -> {
                    PricingDriverDto dto = new PricingDriverDto();
                    dto.setName(entry.getKey());
                    dto.setImportance(((Number) entry.getValue()).doubleValue());
                    return dto;
                })
                .filter(dto -> dto.getImportance() != null && dto.getImportance() > 0)
                .sorted(Comparator.comparing(PricingDriverDto::getImportance).reversed())
                .limit(limit)
                .toList();
    }

    private String buildClientContext(Map<String, Object> pricingDetails, String siren) {
        Map<String, Object> clientFeatures = getMap(pricingDetails.get("client_features"));
        if (clientFeatures == null || !Boolean.TRUE.equals(clientFeatures.get("client_found"))) {
            return siren == null || siren.isBlank()
                    ? "No client-specific context was used."
                    : "No historical client profile was found for " + siren + ".";
        }

        Map<String, Object> metadata = getMap(clientFeatures.get("metadata"));
        if (metadata == null) {
            return "Client profile found and applied to pricing.";
        }

        String orders = valueAsString(metadata.get("client_nb_orders"));
        String averagePrice = formatNumber(metadata.get("client_avg_price_ht"));
        String seniority = valueAsString(metadata.get("client_seniority_years"));
        String recency = valueAsString(metadata.get("client_recency_days"));

        return "Client profile found for " + valueAsString(clientFeatures.get("siren"))
                + " with " + orders + " historical orders, average price HT " + averagePrice
                + ", seniority " + seniority + " years, recency " + recency + " days.";
    }

    private List<String> buildInsights(
            QuoteResponseDto baseQuote,
            PricingExplanationDto explanation,
            Map<String, Object> pricingDetails
    ) {
        List<String> insights = new ArrayList<>();
        insights.add("Selected strategy: " + valueAsString(baseQuote.getSelectedStrategy())
                + " via model " + valueAsString(baseQuote.getSelectedModel())
                + " with suggested unit price " + formatNumber(baseQuote.getSelectedPrice()) + ".");

        Map<String, Object> selectedBlock = getMap(pricingDetails.get(explanation.getSelectedSourceKey()));
        if (selectedBlock != null) {
            Double r2 = readR2(selectedBlock);
            if (r2 != null) {
                insights.add("Model fit (R2): " + formatNumber(r2) + ".");
            }
        }

        if (!explanation.getTopDrivers().isEmpty()) {
            String drivers = explanation.getTopDrivers().stream()
                    .limit(3)
                    .map(driver -> driver.getName() + " (" + formatNumber(driver.getImportance()) + ")")
                    .reduce((left, right) -> left + ", " + right)
                    .orElse("");
            insights.add("Main drivers from the selected explanation: " + drivers + ".");
        }

        if (explanation.getFormula() != null && !explanation.getFormula().isBlank()) {
            insights.add("A linear formula is available for this selected model.");
        } else if ("SHAP".equalsIgnoreCase(explanation.getExplanationType())) {
            insights.add("The selected model exposes SHAP-style explanations.");
        } else if ("FEATURE_IMPORTANCE".equalsIgnoreCase(explanation.getExplanationType())) {
            insights.add("The selected model exposes feature-importance style explanations.");
        }

        return insights;
    }

    private List<PricingModelSummaryDto> buildModelSummaries(Map<String, Object> pricingDetails) {
        return List.of(
                        buildModelSummary(pricingDetails, "global_prediction", "Global model"),
                        buildModelSummary(pricingDetails, "family_linear", "Family linear"),
                        buildModelSummary(pricingDetails, "family_nonlinear", "Family nonlinear"),
                        buildModelSummary(pricingDetails, "couple_linear", "Client-family linear"),
                        buildModelSummary(pricingDetails, "couple_nonlinear", "Client-family nonlinear")
                ).stream()
                .filter(summary -> summary.getModelName() != null)
                .toList();
    }

    private PricingModelSummaryDto buildModelSummary(Map<String, Object> pricingDetails, String key, String label) {
        Map<String, Object> block = getMap(pricingDetails.get(key));
        PricingModelSummaryDto dto = new PricingModelSummaryDto();
        dto.setKey(key);
        dto.setLabel(label);
        if (block == null) {
            return dto;
        }

        dto.setModelName(readString(block.get("model_name")));
        dto.setPrediction(readDouble(block.get("prediction")));
        dto.setR2(readR2(block));
        dto.setAvailable(readBoolean(block.get("available")));
        dto.setExplanationType(resolveExplanationType(block));
        return dto;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(Object raw) {
        if (raw instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private String readString(Object value) {
        return value == null ? null : value.toString();
    }

    private Boolean readBoolean(Object value) {
        return value instanceof Boolean bool ? bool : null;
    }

    private Double readDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private Double readR2(Map<String, Object> block) {
        Map<String, Object> metrics = getMap(block.get("metrics"));
        return metrics == null ? null : readDouble(metrics.get("r2"));
    }

    private String valueAsString(Object value) {
        return value == null ? "n/a" : value.toString();
    }

    private String formatNumber(Object value) {
        if (!(value instanceof Number number)) {
            return valueAsString(value);
        }
        return String.format(java.util.Locale.US, "%.4f", number.doubleValue());
    }
}
