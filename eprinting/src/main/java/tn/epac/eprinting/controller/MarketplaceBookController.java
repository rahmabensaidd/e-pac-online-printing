package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.model.dtos.BookReviewDto;
import tn.epac.eprinting.model.entities.BookReview;
import tn.epac.eprinting.repository.BookReviewRepository;
import tn.epac.eprinting.service.AdminBookService;
import tn.epac.eprinting.model.dtos.BookResponseDto;

import java.util.List;

@RestController
@RequestMapping("/api/books/marketplace")
@RequiredArgsConstructor
public class MarketplaceBookController {

    private final AdminBookService adminBookService;
    private final BookReviewRepository bookReviewRepository;

    @GetMapping
    public ResponseEntity<Page<BookResponseDto>> getMarketplaceBooks(
            @PageableDefault(size = 20, sort = "bookId") Pageable pageable,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(adminBookService.getMarketplaceBooks(pageable, search));
    }

    @GetMapping("/reviews/featured")
    public ResponseEntity<List<BookReviewDto>> getFeaturedReviews() {
        List<BookReviewDto> reviews = bookReviewRepository.findTop6ByFeaturedTrueOrderByCreatedAtDesc()
                .stream()
                .map(this::toReviewDto)
                .toList();
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/{bookId}/reviews")
    public ResponseEntity<List<BookReviewDto>> getBookReviews(@PathVariable Long bookId) {
        List<BookReviewDto> reviews = bookReviewRepository.findTop2ByBookBookIdOrderByCreatedAtDesc(bookId)
                .stream()
                .map(this::toReviewDto)
                .toList();
        return ResponseEntity.ok(reviews);
    }

    private BookReviewDto toReviewDto(BookReview review) {
        return BookReviewDto.builder()
                .reviewId(review.getReviewId())
                .bookId(review.getBook() != null ? review.getBook().getBookId() : null)
                .bookTitle(review.getBook() != null ? review.getBook().getTitle() : null)
                .reviewerName(review.getReviewerName())
                .reviewerRole(review.getReviewerRole())
                .rating(review.getRating())
                .comment(review.getComment())
                .featured(review.getFeatured())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
