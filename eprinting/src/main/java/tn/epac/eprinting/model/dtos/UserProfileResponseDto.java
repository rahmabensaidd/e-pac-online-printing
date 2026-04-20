package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponseDto {
    private Long userId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String username;
    private String phone;
    private String company;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private LocalDate registrationDate;
    private long totalOrders;
    private LocalDate lastOrderDate;
}
