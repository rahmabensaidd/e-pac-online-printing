package tn.epac.eprinting.model.enums;

public enum CoverPaperType {

    GLOSS_TEXT_100,
    GLOSS_TEXT_80,
    GLOSS_COVER_80,

    PT10_C1S,
    PT12_C1S,
    PT16_C1S,

    PT10_C2S,
    PT12_C2S,

    NONE;

    public static CoverPaperType fromValue(String value) {
        if (value == null) return NONE;

        switch (value.toUpperCase()) {
            case "100_GLOSS_TEXT": return GLOSS_TEXT_100;
            case "80_GLOSS_TEXT": return GLOSS_TEXT_80;
            case "80_GLOSS_COVER": return GLOSS_COVER_80;

            case "10PT_C1S": return PT10_C1S;
            case "12PT_C1S": return PT12_C1S;
            case "16PT_C1S": return PT16_C1S;

            case "10PT_C2S": return PT10_C2S;
            case "12PT_C2S": return PT12_C2S;

            case "NONE": return NONE;

            default: return NONE;
        }
    }
}
