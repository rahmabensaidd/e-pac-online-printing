package tn.epac.eprinting.model.dtos;


public class QuoteRequestDto {
    private String siren;
    private String bindingType;
    private ProductConfigurationDto product;

    public String getSiren() {
        return siren;
    }

    public void setSiren(String siren) {
        this.siren = siren;
    }

    public String getBindingType() {
        return bindingType;
    }

    public void setBindingType(String bindingType) {
        this.bindingType = bindingType;
    }

    public ProductConfigurationDto getProduct() {
        return product;
    }

    public void setProduct(ProductConfigurationDto product) {
        this.product = product;
    }
}