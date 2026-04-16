package tn.epac.eprinting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.service.AdminBookService;
import tn.epac.eprinting.model.dtos.BookResponseDto;

@RestController
@RequestMapping("/api/books/marketplace")
@RequiredArgsConstructor
public class MarketplaceBookController {

    private final AdminBookService adminBookService;

    @GetMapping
    public ResponseEntity<Page<BookResponseDto>> getMarketplaceBooks(
            @PageableDefault(size = 20, sort = "bookId") Pageable pageable,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(adminBookService.getMarketplaceBooks(pageable, search));
    }
}
