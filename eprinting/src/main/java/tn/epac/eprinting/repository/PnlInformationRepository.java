package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.PnlInformation;

import java.util.List;

public interface PnlInformationRepository extends JpaRepository<PnlInformation, Long> {

    @Query(value = "SELECT * FROM pnl_information WHERE book_id = :bookId", nativeQuery = true)
    List<PnlInformation> findByBookId(@Param("bookId") Long bookId);
}
