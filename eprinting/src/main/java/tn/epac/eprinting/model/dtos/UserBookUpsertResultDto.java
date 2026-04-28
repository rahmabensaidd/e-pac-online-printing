package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBookUpsertResultDto {
    private BookResponseDto book;
    private boolean updatedInPlace;
    private boolean cloned;
    private String message;
}
