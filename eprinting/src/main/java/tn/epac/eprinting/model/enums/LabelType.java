package tn.epac.eprinting.model.enums;
public enum LabelType {

    NONE("NONE"),

    STANDARD("STANDARD"),

    ISBN("ISBN"),
    ISBN_ST("ISBN-ST"),

    OTHER("OTHER");

    private final String value;

    LabelType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static LabelType fromValue(String value) {
        if (value == null) return null;

        String normalized = value.trim().toUpperCase();

        switch (normalized) {

            case "NONE":
                return NONE;

            case "STANDARD":
            case "YES":
                return STANDARD;

            case "ISBN":
            case "ISBN-ST":
            case "BAR CODE":
            case "NO (IF BAR CODE LABEL)":
            case "978-0-357-37403-0":
                return ISBN;

            case "ADVANCE COPY (SILVER)":
            case "FLORIDA":
            case "RELX":
            case "2":
            case "GRADE 1":
            case "GRADE 2":
            case "GRADE 3":
            case "GRADE 4":
            case "GRADE 5":
            case "GRADE K":
            case "LABEL TYPE MXTST":
                return OTHER;

            default:
                throw new IllegalArgumentException("Invalid LabelType: " + value);
        }
    }
}