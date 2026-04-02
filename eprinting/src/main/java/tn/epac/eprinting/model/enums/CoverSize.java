package tn.epac.eprinting.model.enums;

import lombok.Getter;

@Getter
public enum CoverSize {

    L("L"),
    M("M"),
    XL("XL"),
    XXL("XXL"),
    NONE("NONE");

    private final String value;

    CoverSize(String value) {
        this.value = value;
    }

    public static CoverSize fromValue(String value) {
        if (value == null) return NONE;

        switch (value.toUpperCase()) {
            case "L": return L;
            case "M": return M;
            case "XL": return XL;
            case "XXL": return XXL;
            case "NONE": return NONE;
            default: return NONE;
        }
    }
}