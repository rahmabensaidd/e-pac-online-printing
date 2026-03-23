package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class CoverTemplate extends Template {

    private String frontModel;

    private String textAreas;
}