package tn.epac.eprinting.model.entities;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;


@Entity
@Getter
@Setter
public class TextTemplate extends Template {

    private String fonts;

    private String margins;
}