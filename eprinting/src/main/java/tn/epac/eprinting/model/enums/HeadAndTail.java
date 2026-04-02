package tn.epac.eprinting.model.enums;

public enum HeadAndTail {
    BLACK_AND_WHITE,
    WHITE,
    NONE;


    public static HeadAndTail fromValue(String value) {
        if (value == null) return NONE;

        switch (value.toUpperCase()) {
            case "BLACK & WHITE":
                return BLACK_AND_WHITE;
            case "WHITE":
                return WHITE;
            case "NONE":
                return NONE;
            default:
                return NONE;
        }
    }
}
