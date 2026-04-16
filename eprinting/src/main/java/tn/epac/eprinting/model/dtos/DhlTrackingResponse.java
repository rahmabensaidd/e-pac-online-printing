package tn.epac.eprinting.model.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class DhlTrackingResponse {
    private List<DhlShipmentDto> shipments;
}