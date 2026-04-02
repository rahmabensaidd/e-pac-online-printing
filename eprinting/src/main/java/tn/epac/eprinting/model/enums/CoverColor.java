package tn.epac.eprinting.model.enums;

import lombok.Getter;

@Getter
public enum CoverColor {

    FOUR_FOUR("4/4"),
    FOUR_ZERO("4/0"),
    FOUR_ONE("4/1"),
    ZERO_ZERO("0/0"),
    ONE_ZERO("1/0");

    private final String value;

    CoverColor(String value) {
        this.value = value;
    }

    public static CoverColor fromValue(String value) {
        for (CoverColor c : CoverColor.values()) {
            if (c.value.equalsIgnoreCase(value)) {
                return c;
            }
        }
        throw new IllegalArgumentException("Invalid CoverColor: " + value);
    }
}