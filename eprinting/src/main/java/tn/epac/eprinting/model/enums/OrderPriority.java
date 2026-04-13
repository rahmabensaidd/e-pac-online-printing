package tn.epac.eprinting.model.enums;

public enum OrderPriority {
    NORMAL(0),
    HIGH1(1),
    HIGH2(2),
    HIGH3(3),
    // Legacy values kept for backward compatibility with existing rows
    LOW(0),
    MEDIUM(1),
    HIGH(3);

    private final int rank;

    OrderPriority(int rank) {
        this.rank = rank;
    }

    public int rank() {
        return rank;
    }

    public static OrderPriority fromString(String value) {
        if (value == null || value.isBlank()) {
            return NORMAL;
        }
        try {
            return OrderPriority.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return NORMAL;
        }
    }
}
