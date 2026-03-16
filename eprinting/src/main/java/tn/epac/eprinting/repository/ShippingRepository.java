package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Shipping;
import tn.epac.eprinting.model.enums.ShippingStatus;

import java.util.List;

public interface ShippingRepository extends JpaRepository<Shipping, Long> {

    List<Shipping> findByShippingStatus(ShippingStatus status);
}
