package tn.epac.eprinting.model.enums;

public enum BindingType {

    CASEBIND,
    CASEBIND_INS,
    CASEBIND_ES,
    CASEBIND_ES_INS,
    PERFECT,
    PERFECT_INS,
    PERFECT_NC,
    PERFECT_NC_INS,
    COILHARD,
    COILHARD_INS,
    COILHARD_TAB,
    COILSOFT,
    LOOSELEAF,
    LOOSELEAF_INS,
    LOOSELEAF_NC,
    LOOSELEAF_NC_INS,
    LOOSELEAF_NC_TAB,
    SS,
    CARD,
    DIVIDER_SHEET,
    NONE;

    public static BindingType fromValue(String value) {
        if (value == null || value.isEmpty()) return NONE;

        switch (value.toUpperCase()) {
            case "CASEBIND": return CASEBIND;
            case "CASEBIND_INS": return CASEBIND_INS;
            case "CASEBIND_ES": return CASEBIND_ES;
            case "CASEBIND_ES_INS": return CASEBIND_ES_INS;
            case "PERFECT": return PERFECT;
            case "PERFECT_INS": return PERFECT_INS;
            case "PERFECT_NC": return PERFECT_NC;
            case "PERFECT_NC_INS": return PERFECT_NC_INS;
            case "COILHARD": return COILHARD;
            case "COILHARD_INS": return COILHARD_INS;
            case "COILHARD_TAB": return COILHARD_TAB;
            case "COILSOFT": return COILSOFT;
            case "LOOSELEAF": return LOOSELEAF;
            case "LOOSELEAF_INS": return LOOSELEAF_INS;
            case "LOOSELEAF_NC": return LOOSELEAF_NC;
            case "LOOSELEAF_NC_INS": return LOOSELEAF_NC_INS;
            case "LOOSELEAF_NC_TAB": return LOOSELEAF_NC_TAB;
            case "SS": return SS;
            case "CARD": return CARD;
            case "DIVIDER_SHEET": return DIVIDER_SHEET;
            default: return NONE;
        }
    }
}