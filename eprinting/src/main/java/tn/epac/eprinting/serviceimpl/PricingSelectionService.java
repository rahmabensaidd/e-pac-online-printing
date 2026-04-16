package tn.epac.eprinting.serviceimpl;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PricingSelectionService {

    private static final double MIN_R2_THRESHOLD = 0.60;

    public SelectedPrediction selectBest(Map<String, Object> response, String requestSiren) {
        boolean sirenKnown = requestSiren != null
                && !requestSiren.trim().isEmpty()
                && !"NONE".equalsIgnoreCase(requestSiren.trim());

        if (sirenKnown) {
            SelectedPrediction coupleLinear = extract(response, "couple_linear", "COUPLE_LINEAR", true);
            if (coupleLinear != null) {
                return coupleLinear;
            }

            SelectedPrediction familyLinear = extract(response, "family_linear", "FAMILY_LINEAR", true);
            if (familyLinear != null) {
                return familyLinear;
            }
        } else {
            SelectedPrediction familyLinear = extract(response, "family_linear", "FAMILY_LINEAR", true);
            if (familyLinear != null) {
                return familyLinear;
            }
        }

        return extract(response, "global_prediction", "GLOBAL", false);
    }

    @SuppressWarnings("unchecked")
    private SelectedPrediction extract(Map<String, Object> response,
                                       String key,
                                       String strategy,
                                       boolean enforceR2Threshold) {
        Object raw = response.get(key);
        if (!(raw instanceof Map<?, ?>)) {
            return null;
        }

        Map<String, Object> prediction = (Map<String, Object>) raw;

        Object available = prediction.get("available");
        Object predictionValue = prediction.get("prediction");
        Object modelName = prediction.get("model_name");

        if (!Boolean.TRUE.equals(available) || !(predictionValue instanceof Number number)) {
            return null;
        }

        Double r2 = extractR2(prediction);
        if (enforceR2Threshold && (r2 == null || r2 < MIN_R2_THRESHOLD)) {
            return null;
        }

        SelectedPrediction result = new SelectedPrediction();
        result.setPrice(number.doubleValue());
        result.setModelName(modelName != null ? modelName.toString() : key);
        result.setStrategy(strategy);
        result.setR2(r2);

        return result;
    }

    @SuppressWarnings("unchecked")
    private Double extractR2(Map<String, Object> prediction) {
        Object rawMetrics = prediction.get("metrics");
        if (!(rawMetrics instanceof Map<?, ?>)) {
            return null;
        }

        Map<String, Object> metrics = (Map<String, Object>) rawMetrics;
        Object r2 = metrics.get("r2");

        if (r2 instanceof Number number) {
            return number.doubleValue();
        }

        return null;
    }
}