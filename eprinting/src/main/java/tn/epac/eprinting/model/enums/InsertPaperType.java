package tn.epac.eprinting.model.enums;

public enum InsertPaperType {

    NONE("NONE"),

    C1S_10PT("10PT_C1S"),
    C2S_10PT("10PT_C2S"),
    C2S_12PT("12PT_C2S"),

    GLOSS_TEXT_80("80_GLOSSTEXT");

    private final String value;

    InsertPaperType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static InsertPaperType fromValue(String value) {
        if (value == null) return NONE;

        String normalized = value.trim().toUpperCase();

        switch (normalized) {

            case "NONE":
                return NONE;

            case "10PT_C2S":
                return C2S_10PT;

            case "10PT_C1S":
                return C1S_10PT;

            case "12PT_C2S":
                return C2S_12PT;

            case "80_GLOSSTEXT":
                return GLOSS_TEXT_80;

            default:
                return NONE;
        }
    }
}
