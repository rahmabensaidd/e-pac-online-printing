package tn.epac.eprinting.model.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminUserResponseDto {
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String username;
    private String role;
    private Boolean enabled;
    private Long totalOrders;
}
