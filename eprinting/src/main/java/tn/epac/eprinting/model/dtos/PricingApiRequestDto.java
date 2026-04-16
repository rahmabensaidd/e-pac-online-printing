package tn.epac.eprinting.model.dtos;

import java.util.Map;

public class PricingApiRequestDto {
    private String siren;
    private String binding_type;
    private Map<String, Object> features;

    public String getSiren() { return siren; }
    public void setSiren(String siren) { this.siren = siren; }

    public String getBinding_type() { return binding_type; }
    public void setBinding_type(String binding_type) { this.binding_type = binding_type; }

    public Map<String, Object> getFeatures() { return features; }
    public void setFeatures(Map<String, Object> features) { this.features = features; }
}