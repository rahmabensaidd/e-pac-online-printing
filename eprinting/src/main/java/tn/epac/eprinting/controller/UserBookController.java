package tn.epac.eprinting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.epac.eprinting.model.dtos.BookRequestDto;
import tn.epac.eprinting.model.dtos.BookResponseDto;
import tn.epac.eprinting.service.AdminBookService;

import java.util.List;

@RestController
@RequestMapping("/api/user/books")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('user','admin')")
public class UserBookController {

    private final AdminBookService adminBookService;

    @PostMapping
    public ResponseEntity<BookResponseDto> createUserBook(
            @Valid @RequestBody BookRequestDto bookRequest,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long creatorUserId = extractUserId(jwt);
        BookResponseDto createdBook = adminBookService.createUserBook(bookRequest, creatorUserId);
        return new ResponseEntity<>(createdBook, HttpStatus.CREATED);
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookResponseDto>> getMyCustomBooks(@AuthenticationPrincipal Jwt jwt) {
        Long creatorUserId = extractUserId(jwt);
        return ResponseEntity.ok(adminBookService.getUserCreatedBooks(creatorUserId));
    }

    private Long extractUserId(Jwt jwt) {
        if (jwt == null) {
            return null;
        }

        Object claim = jwt.getClaim("user_id");
        if (claim instanceof Number number) {
            return number.longValue();
        }
        if (claim instanceof String value) {
            try {
                return Long.parseLong(value);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
