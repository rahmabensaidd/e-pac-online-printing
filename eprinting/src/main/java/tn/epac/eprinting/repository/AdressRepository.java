package tn.epac.eprinting.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.Adress;

public interface AdressRepository  extends JpaRepository<Adress, Long> {
}
