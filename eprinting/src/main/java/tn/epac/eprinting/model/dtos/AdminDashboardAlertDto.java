package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminDashboardAlertDto {
    private String id;
    private String title;
    private String description;
    private String route;
    private String tone;
}
