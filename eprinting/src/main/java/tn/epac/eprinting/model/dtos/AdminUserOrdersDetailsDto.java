package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminUserOrdersDetailsDto {
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String username;
    private String role;
    private Long totalOrders;
    private List<AdminUserOrderSummaryDto> orders;
}
