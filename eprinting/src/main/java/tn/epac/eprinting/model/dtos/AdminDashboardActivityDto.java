package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminDashboardActivityDto {
    private String id;
    private String title;
    private String description;
    private String timestamp;
    private String route;
    private String tone;
    private String icon;
}
