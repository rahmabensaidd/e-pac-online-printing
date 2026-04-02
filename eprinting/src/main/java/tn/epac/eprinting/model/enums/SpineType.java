package tn.epac.eprinting.model.enums;

public enum SpineType {

    NONE("NONE"),
    ROUND("ROUND"),
    SQUARE("SQUARE");

    private final String value;

    SpineType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static SpineType fromValue(String value) {
        if (value == null) return NONE;

        String normalized = value.trim().toUpperCase();

        switch (normalized) {
            case "NONE":
                return NONE;

            case "ROUND":
                return ROUND;

            case "SQUARE":
                return SQUARE;

            default:
                return NONE;
        }
    }
}