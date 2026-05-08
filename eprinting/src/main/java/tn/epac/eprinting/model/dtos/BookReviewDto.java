package tn.epac.eprinting.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookReviewDto {
    private Long reviewId;
    private Long bookId;
    private String bookTitle;
    private String reviewerName;
    private String reviewerRole;
    private Integer rating;
    private String comment;
    private Boolean featured;
    private LocalDateTime createdAt;
}
