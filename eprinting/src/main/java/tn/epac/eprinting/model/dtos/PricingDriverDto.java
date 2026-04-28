package tn.epac.eprinting.model.dtos;

public class PricingDriverDto {
    private String name;
    private Double importance;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getImportance() {
        return importance;
    }

    public void setImportance(Double importance) {
        this.importance = importance;
    }
}
