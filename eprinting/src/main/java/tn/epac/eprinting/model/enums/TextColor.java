package tn.epac.eprinting.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TextColor {
    ONE_ONE("1/1"),
    FOUR_FOUR("4/4");

    private final String value;

    TextColor(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TextColor fromValue(String value) {
        for (TextColor tc : TextColor.values()) {
            if (tc.value.equals(value)) {
                return tc;
            }
        }
        throw new IllegalArgumentException("Invalid TextColor: " + value);
    }
}
