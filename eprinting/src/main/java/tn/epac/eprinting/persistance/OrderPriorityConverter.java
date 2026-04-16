package tn.epac.eprinting.persistance;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tn.epac.eprinting.model.enums.OrderPriority;

@Converter(autoApply = false)
public class OrderPriorityConverter implements AttributeConverter<OrderPriority, String> {

    @Override
    public String convertToDatabaseColumn(OrderPriority attribute) {
        if (attribute == null) {
            return "LOW";
        }

        return switch (attribute) {
            case NORMAL -> "LOW";
            case HIGH1  -> "MEDIUM";
            case HIGH2, HIGH3 -> "HIGH";
        };
    }

    @Override
    public OrderPriority convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return OrderPriority.NORMAL;
        }

        return switch (dbData.trim().toUpperCase()) {
            case "LOW", "NORMAL" -> OrderPriority.NORMAL;
            case "MEDIUM", "HIGH1" -> OrderPriority.HIGH1;
            case "HIGH", "HIGH2", "HIGH3" -> OrderPriority.HIGH3;
            default -> OrderPriority.NORMAL;
        };
    }
}