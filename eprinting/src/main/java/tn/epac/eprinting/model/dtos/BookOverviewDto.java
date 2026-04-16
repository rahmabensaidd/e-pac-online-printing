package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookOverviewDto {
    private Long totalBooks;
    private Long lowStockBooks;
    private Long avgCoverageDays;
    private Long incomingUnits;
}