package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;
/**
 * CoverTemplate entity - extends Template for book cover layouts.
 * Stores front model and text areas configuration.
 */
@Entity
@Getter
@Setter
public class CoverTemplate extends Template {

    private String frontModel;

    private String textAreas;
}