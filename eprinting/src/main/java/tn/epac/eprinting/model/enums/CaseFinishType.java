package tn.epac.eprinting.model.enums;

public enum CaseFinishType {

    NONE("NONE"),

    LAYFLAT_GLOSS("LAYFLAT-GLOSS"),

    LAYFLAT_MATTE("LAYFLAT-MATTE"),

    GLOSS_FILM("GLOSS-FILM");

    private final String value;

    CaseFinishType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CaseFinishType fromValue(String value) {
        if (value == null) return NONE;

        String normalized = value.trim().toUpperCase();

        switch (normalized) {
            case "NONE":
                return NONE;

            case "LAYFLAT-GLOSS":
            case "LAYFLAT GLOSS":
                return LAYFLAT_GLOSS;

            case "LAYFLAT-MATTE":
            case "LAYFLAT MATTE":
            case "LAYFLAT MATTE SCUFF FREE":
                return LAYFLAT_MATTE;

            case "GLOSS-FILM":
            case "GLOSS FILM":
                return GLOSS_FILM;

            default:
                return NONE;
        }
    }
}
