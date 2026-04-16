package tn.epac.eprinting.serviceimpl;

import org.springframework.stereotype.Service;
import tn.epac.eprinting.client.PricingApiClient;
import tn.epac.eprinting.model.dtos.PricingApiRequestDto;
import tn.epac.eprinting.model.dtos.PricingRequestMapper;
import tn.epac.eprinting.model.dtos.QuoteRequestDto;
import tn.epac.eprinting.model.dtos.QuoteResponseDto;

import java.util.Map;

@Service
public class PricingApplicationService {

    private final PricingRequestMapper pricingRequestMapper;
    private final PricingApiClient pricingApiClient;
    private final PricingSelectionService pricingSelectionService;

    public PricingApplicationService(PricingRequestMapper pricingRequestMapper,
                                     PricingApiClient pricingApiClient,
                                     PricingSelectionService pricingSelectionService) {
        this.pricingRequestMapper = pricingRequestMapper;
        this.pricingApiClient = pricingApiClient;
        this.pricingSelectionService = pricingSelectionService;
    }

    public QuoteResponseDto getQuote(QuoteRequestDto request) {
        PricingApiRequestDto pricingRequest = pricingRequestMapper.toPricingApiRequest(request);
        Map<String, Object> pricingResponse = pricingApiClient.predict(pricingRequest);

        SelectedPrediction selected =
                pricingSelectionService.selectBest(pricingResponse, request.getSiren());

        QuoteResponseDto response = new QuoteResponseDto();
        response.setPricingDetails(pricingResponse);

        if (selected == null) {
            response.setAvailable(false);
            response.setSelectedPrice(null);
            response.setSelectedModel(null);
            response.setSelectedStrategy(null);
            response.setMessage("No pricing model available for this configuration");
            return response;
        }

        response.setAvailable(true);
        response.setSelectedPrice(selected.getPrice());
        response.setSelectedModel(selected.getModelName());
        response.setSelectedStrategy(selected.getStrategy());
        response.setMessage("Pricing calculated successfully");

        return response;
    }
}