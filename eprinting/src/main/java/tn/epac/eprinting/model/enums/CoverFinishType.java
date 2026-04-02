package tn.epac.eprinting.model.enums;

import lombok.Getter;

@Getter
public enum CoverFinishType {

    LAYFLAT_GLOSS("LAYFLAT-GLOSS"),
    LAYFLAT_MATTE_SCUFF_FREE("LAYFLAT MATTE SCUFF-FREE"),
    LAYFLAT_MATTE("LAYFLAT-MATTE"),
    MATT("MATT");

    private final String value;

    CoverFinishType(String value) {
        this.value = value;
    }

    public static CoverFinishType fromValue(String value) {
        for (CoverFinishType type : CoverFinishType.values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid CoverFinishType: " + value);
    }
}
