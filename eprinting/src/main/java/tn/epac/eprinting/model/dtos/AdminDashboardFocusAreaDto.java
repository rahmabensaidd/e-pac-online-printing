package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminDashboardFocusAreaDto {
    private String label;
    private String value;
    private String hint;
}
