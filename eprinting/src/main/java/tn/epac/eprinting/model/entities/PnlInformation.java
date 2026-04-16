package tn.epac.eprinting.model.entities;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pnl_information")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PnlInformation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer pnlPageNumber;
    private Integer pnlPrintingNumber;
    private Double pnlHorizontalMargin;
    private Double pnlVerticalMargin;
    private Integer pnlLineSpacing;
    private String pnlFontType;
    private Integer pnlFontSize;
    private Boolean pnlExcluded;

    @OneToMany(mappedBy = "pnlInformation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PnlLine> pnlLines = new ArrayList<>();

    // Helper method (important)
    public void addLine(PnlLine line) {
        pnlLines.add(line);
        line.setPnlInformation(this);
    }

    public void removeLine(PnlLine line) {
        pnlLines.remove(line);
        line.setPnlInformation(null);
    }
}