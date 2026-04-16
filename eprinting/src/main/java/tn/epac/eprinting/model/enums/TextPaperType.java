package tn.epac.eprinting.model.enums;

public enum TextPaperType {

    NONE("NONE"),

    // Standard papers
    PT_10_C2S("10PT_C2S"),
    PT_12_C2S("12PT_C2S"),
    PAP1_70("PAP1_70"),
    PAP1_75("PAP1_75"),
    LETSGO_MATTE_115("LETSGO_MATTE_115"),
    LETSGO_MATTE_90("LETSGO_MATTE_90"),
    BIRCH_W40_TB("BIRCH_W40_TB"),

    // FSC papers
    FSC_MC_CVG_SILKHO_1_0_70("FSC_MC_CVG_SILKHO_1.0_70"),
    FSC_MC_CVG_SILKHO_1_061("FSC_MC_CVG_SILKHO_1.061"),
    FSC_MC_DOM_VJT_1_21_75("FSC_MC_DOM_VJT_1.21_75"),
    FSC_MC_DOM_VJT_1_29_90("FSC_MC_DOM_VJT_1.29_90"),

    // Gloss
    GLOSS_80_TEXT("80_GLOSS_TEXT"),
    GLOSS_80_COVER("80_GLOSS_COVER");

    private final String value;

    TextPaperType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static TextPaperType fromValue(String value) {
        if (value == null) return NONE;

        String normalized = value.trim().toUpperCase();

        switch (normalized) {
            case "NONE": return NONE;
            case "10PT_C2S": return PT_10_C2S;
            case "12PT_C2S": return PT_12_C2S;
            case "PAP1_70": return PAP1_70;
            case "PAP1_75": return PAP1_75;
            case "LETSGO_MATTE_115": return LETSGO_MATTE_115;
            case "LETSGO_MATTE_90": return LETSGO_MATTE_90;
            case "BIRCH_W40_TB": return BIRCH_W40_TB;
            case "FSC_MC_CVG_SILKHO_1.0_70": return FSC_MC_CVG_SILKHO_1_0_70;
            case "FSC_MC_CVG_SILKHO_1.061": return FSC_MC_CVG_SILKHO_1_061;
            case "FSC_MC_DOM_VJT_1.21_75": return FSC_MC_DOM_VJT_1_21_75;
            case "FSC_MC_DOM_VJT_1.29_90": return FSC_MC_DOM_VJT_1_29_90;
            case "80_GLOSS_TEXT": return GLOSS_80_TEXT;
            case "80_GLOSS_COVER": return GLOSS_80_COVER;
            default: return NONE;
        }
    }
}