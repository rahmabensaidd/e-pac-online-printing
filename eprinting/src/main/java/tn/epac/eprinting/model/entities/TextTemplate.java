package tn.epac.eprinting.model.entities;

import lombok.*;

import jakarta.persistence.*;
import java.util.List;
import java.util.Map;

@Entity
@Getter
@Setter
public class TextTemplate extends Template {

    private String fonts;

    private String margins;
}