package tn.epac.eprinting.model.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pnl_line")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PnlLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer lineId;
    private Integer ordering;

    @Column(length = 500)
    private String value;

    private String pnlFontType;
    private Integer pnlFontSize;
    private Boolean pnlFontBold;
    private Boolean pnlFontItalic;

    @ManyToOne
    @JoinColumn(name = "pnl_information_id")
    private PnlInformation pnlInformation;
}