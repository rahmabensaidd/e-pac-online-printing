package tn.epac.eprinting.model.enums;

public enum TabColor {

    NONE("NONE"),

    FULL_COLOR_4_4("4/4"),

    FRONT_COLOR_4_0("4/0"),

    MONO_1_1("1/1");

    private final String value;

    TabColor(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static TabColor fromValue(String value) {
        if (value == null) return NONE;

        String normalized = value.trim().toUpperCase();

        switch (normalized) {
            case "NONE":
                return NONE;

            case "4/4":
                return FULL_COLOR_4_4;

            case "4/0":
                return FRONT_COLOR_4_0;

            case "1/1":
                return MONO_1_1;

            default:
                return NONE;
        }
    }
}