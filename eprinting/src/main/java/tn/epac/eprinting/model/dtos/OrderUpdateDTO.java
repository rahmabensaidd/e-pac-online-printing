package tn.epac.eprinting.model.dtos;



import lombok.Data;
import tn.epac.eprinting.model.enums.OrderStatus;

@Data
public class OrderUpdateDTO {
    private OrderStatus status; // Seulement REJECTED, CANCELLED, SHIPPED
}