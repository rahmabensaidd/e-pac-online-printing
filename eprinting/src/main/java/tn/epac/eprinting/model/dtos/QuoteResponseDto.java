package tn.epac.eprinting.model.dtos;

public class QuoteResponseDto {
    private Double selectedPrice;
    private String selectedModel;
    private String selectedStrategy;
    private boolean available;
    private Object pricingDetails;
    private String message;

    public Double getSelectedPrice() { return selectedPrice; }
    public void setSelectedPrice(Double selectedPrice) { this.selectedPrice = selectedPrice; }

    public String getSelectedModel() { return selectedModel; }
    public void setSelectedModel(String selectedModel) { this.selectedModel = selectedModel; }

    public String getSelectedStrategy() { return selectedStrategy; }
    public void setSelectedStrategy(String selectedStrategy) { this.selectedStrategy = selectedStrategy; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public Object getPricingDetails() { return pricingDetails; }
    public void setPricingDetails(Object pricingDetails) { this.pricingDetails = pricingDetails; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}