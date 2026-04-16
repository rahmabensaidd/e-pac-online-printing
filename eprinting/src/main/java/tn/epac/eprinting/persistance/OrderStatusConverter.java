package tn.epac.eprinting.persistance;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tn.epac.eprinting.model.enums.OrderStatus;

@Converter(autoApply = false)
public class OrderStatusConverter implements AttributeConverter<OrderStatus, String> {

    @Override
    public String convertToDatabaseColumn(OrderStatus attribute) {
        if (attribute == null) {
            return "PENDING";
        }

        return switch (attribute) {
            case PENDING -> "PENDING";
            case IN_PRODUCTION -> "PROCESSING"; // adapter selon DB
            case READY_TO_SHIP -> "READY";
            case SHIPPED -> "SHIPPED";
            case DELIVERED -> "DELIVERED";
            case CANCELLED -> "CANCELLED";
            case REJECTED -> "REJECTED";
        };
    }

    @Override
    public OrderStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return OrderStatus.PENDING;
        }

        return switch (dbData.toUpperCase()) {
            case "PENDING" -> OrderStatus.PENDING;
            case "PROCESSING" -> OrderStatus.IN_PRODUCTION;
            case "READY" -> OrderStatus.READY_TO_SHIP;
            case "SHIPPED" -> OrderStatus.SHIPPED;
            case "DELIVERED" -> OrderStatus.DELIVERED;
            default -> OrderStatus.PENDING;
        };
    }
}