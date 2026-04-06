package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.epac.eprinting.model.entities.PnlLine;

import java.util.List;

public interface PnlLineRepository extends JpaRepository<PnlLine, Long> {

    List<PnlLine> findByPnlInformationId(Long pnlInformationId);
}
