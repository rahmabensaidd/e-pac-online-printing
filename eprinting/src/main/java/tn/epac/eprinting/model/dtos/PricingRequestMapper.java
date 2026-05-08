package tn.epac.eprinting.model.dtos;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class PricingRequestMapper {

    public PricingApiRequestDto toPricingApiRequest(QuoteRequestDto request) {
        PricingApiRequestDto dto = new PricingApiRequestDto();
        dto.setSiren(request.getSiren());
        dto.setBinding_type(request.getBindingType());

        ProductConfigurationDto p = request.getProduct();
        Map<String, Object> features = new HashMap<>();

        features.put("quantity", defaultInt(p.getQuantity()));
        features.put("production_page", defaultInt(p.getProductionPage()));
        features.put("height", defaultDouble(p.getHeight()));
        features.put("thickness", defaultDouble(p.getThickness()));
        features.put("width", defaultDouble(p.getWidth()));

        features.put("security_label", defaultInt(p.getSecurityLabel()));
        features.put("has_coil", defaultInt(p.getHasCoil()));
        features.put("has_insert", defaultInt(p.getHasInsert()));
        features.put("has_tab", defaultInt(p.getHasTab()));
        features.put("has_backcover", defaultInt(p.getHasBackcover()));
        features.put("perf", defaultInt(p.getPerf()));
        features.put("double_sided_cover", defaultInt(p.getDoubleSidedCover()));
        features.put("shrinkwrap", defaultInt(p.getShrinkwrap()));
        features.put("three_hole_drill", defaultInt(p.getThreeHoleDrill()));

        features.put("text_paper_type", mapTextPaperType(p.getTextPaperType()));
        features.put("text_color", mapTextColor(p.getTextColor()));
        features.put("cover_paper_type", defaultString(p.getCoverPaperType(), "NONE"));
        features.put("cover_finish_type", defaultString(p.getCoverFinishType(), "NONE"));
        features.put("cover_color", mapCoverColor(p.getCoverColor()));
        features.put("cover_size", defaultString(p.getCoverSize(), "MISSING"));
        features.put("priority_level", defaultString(p.getPriorityLevel(), "NORMAL"));
        features.put("head_and_tail", defaultString(p.getHeadAndTail(), "NONE"));
        features.put("coil_type", defaultString(p.getCoilType(), "NONE"));
        features.put("tab_color", defaultString(p.getTabColor(), "NONE"));
        features.put("insert_paper_type", defaultString(p.getInsertPaperType(), "NONE"));
        features.put("case_finish_type", defaultString(p.getCaseFinishType(), "NONE"));
        features.put("spine_type", defaultString(p.getSpineType(), "NONE"));
        features.put("label_type", defaultString(p.getLabelType(), "NONE"));

        dto.setFeatures(features);
        return dto;
    }

    private Integer defaultInt(Integer value) {
        return value == null ? 0 : value;
    }

    private Double defaultDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String mapTextColor(String value) {
        if (value == null) return "4/4";
        return switch (value) {
            case "ONE_ONE" -> "1/1";
            case "FOUR_FOUR" -> "4/4";
            default -> value;
        };
    }

    private String mapCoverColor(String value) {
        if (value == null) return "4/0";
        return switch (value) {
            case "FOUR_FOUR" -> "4/4";
            case "FOUR_ZERO" -> "4/0";
            case "FOUR_ONE" -> "4/1";
            case "ZERO_ZERO" -> "0/0";
            case "ONE_ZERO" -> "1/0";
            default -> value;
        };
    }

    private String mapTextPaperType(String value) {
        String normalized = defaultString(value, "NONE").trim().toUpperCase();
        return switch (normalized) {
            case "NONE" -> "MISSING";
            case "80_GLOSSTEXT", "80_GLOSS_TEXT" -> "80_GLOSS_TEXT";
            case "80_GLOSSCOVER" -> "80_GLOSS_COVER";
            case "10PT_C2S" -> "10PT_C2S";
            case "12PT_C2S" -> "12PT_C2S";
            case "PAP1SW_70" -> "PAP1_70";
            case "PAP1_75" -> "PAP1_75";
            case "LETSGO MATTE 115GSM" -> "LETSGO_MATTE_115";
            case "LETSGO MATTE 90GSM" -> "LETSGO_MATTE_90";
            case "FSC_MC_CVG_SILKHO_1.0_70" -> "FSC_MC_CVG_SILKHO_1.0_70";
            case "FSC_MC_CVG_SILKHO_1.061", "FSC_MC_CVG_SILKHO_1.061_CB", "FSC_MC_CVG_SILKHO_1.061_CB_BW" ->
                    "FSC_MC_CVG_SILKHO_1.061";
            case "FSC_MC_CVG_SILKHO_1.0_70_CB", "FSC_MC_CVG_SILKHO_1.0_70_BW" -> "FSC_MC_CVG_SILKHO_1.0_70";
            case "FSC_MC_DOM_VJT_1.21_75", "FSC_MC_DOM_VJT_1.21_75_BW" -> "FSC_MC_DOM_VJT_1.21_75";
            case "FSC_MC_DOM_VJT_1.29_90", "FSC_MC_DOM_VJT_1.29_90_BW" -> "FSC_MC_DOM_VJT_1.29_90";
            case "BIRCH_W40_TB" -> "BIRCH_W40_TB";
            case "SFI_CVG_UCR_1.8_66" -> "SFI_CVG_66";
            default -> normalized;
        };
    }
}
