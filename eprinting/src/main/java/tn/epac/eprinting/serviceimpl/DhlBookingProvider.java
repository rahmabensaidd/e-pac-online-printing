package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tn.epac.eprinting.model.dtos.ShipmentBookingRequest;
import tn.epac.eprinting.model.dtos.ShipmentBookingResult;
import tn.epac.eprinting.service.ShippingBookingProvider;

@Service
@RequiredArgsConstructor
public class DhlBookingProvider implements ShippingBookingProvider {

    private final WebClient dhlFreightWebClient;
    private final DhlFreightAuthService dhlFreightAuthService;

    @Override
    public ShipmentBookingResult book(ShipmentBookingRequest request) {
        String accessToken = dhlFreightAuthService.getAccessToken();

        DhlFreightBookingRequest payload = mapToDhlRequest(request);

        DhlFreightBookingResponse response = dhlFreightWebClient.post()
                .uri("/shipment-bookings")
                .headers(headers -> headers.setBearerAuth(accessToken))
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(DhlFreightBookingResponse.class)
                .block();

        return mapToResult(response);
    }

    private DhlFreightBookingRequest mapToDhlRequest(ShipmentBookingRequest request) {
        DhlFreightBookingRequest dto = new DhlFreightBookingRequest();
        dto.setReference(request.getReference());
        dto.setAccountId(request.getAccountId());
        dto.setServiceCode(request.getServiceCode());
        dto.setCompanyName(request.getCompanyName());
        dto.setContactName(request.getContactName());
        dto.setEmail(request.getEmail());
        dto.setPhone(request.getPhone());
        dto.setStreet(request.getStreet());
        dto.setCity(request.getCity());
        dto.setPostalCode(request.getPostalCode());
        dto.setCountryCode(request.getCountryCode());
        dto.setTotalWeight(request.getTotalWeight());
        dto.setPackagesCount(request.getPackagesCount());
        return dto;
    }

    private ShipmentBookingResult mapToResult(DhlFreightBookingResponse response) {
        ShipmentBookingResult result = new ShipmentBookingResult();
        result.setSuccess(response != null);
        result.setCarrier("DHL");

        if (response == null) {
            return result;
        }

        result.setCarrierShipmentId(response.getShipmentId());
        result.setTrackingNumber(response.getShipmentId());
        result.setRawStatus(response.getStatus());
        result.setEstimatedDelivery(response.getEstimatedDelivery());
        return result;
    }

}