package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
public class CoverTemplate extends Template {

    private String frontModel;

    private String textAreas;
}