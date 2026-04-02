package tn.epac.eprinting.model.enums;
public enum CoilType {

    NONE("NONE"),
    METAL("METAL"),
    PLASTIC("PLASTIC");


    private final String value;

    CoilType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CoilType fromValue(String value) {
        if (value == null) return NONE;

        String normalized = value.trim().toUpperCase();

        if (normalized.equals("NONE")) return NONE;

        if (normalized.contains("METAL")) return METAL;

        if (normalized.contains("PLASTIC") || normalized.equals("1/C") || normalized.equals("4/C")) {
            return PLASTIC;
        }

        return NONE;
    }
}