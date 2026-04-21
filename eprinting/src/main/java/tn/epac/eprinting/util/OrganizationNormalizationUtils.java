package tn.epac.eprinting.util;

import java.text.Normalizer;
import java.util.Locale;

public final class OrganizationNormalizationUtils {

    private OrganizationNormalizationUtils() {
    }

    public static String normalizeSiren(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim().toLowerCase(Locale.ROOT);
        String decomposed = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return decomposed.replaceAll("\\s+", " ").trim();
    }

    public static String normalizeOrganizationName(String raw) {
        if (raw == null) {
            return "";
        }

        String trimmed = raw.trim().toLowerCase(Locale.ROOT);
        String decomposed = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String noPunctuation = decomposed.replaceAll("[\\p{Punct}]", " ");
        return noPunctuation.replaceAll("\\s+", " ").trim();
    }
}
