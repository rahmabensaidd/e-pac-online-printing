package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.OrderLine;

import java.util.List;

public interface OrderLineRepository extends JpaRepository<OrderLine, Long> {



}
