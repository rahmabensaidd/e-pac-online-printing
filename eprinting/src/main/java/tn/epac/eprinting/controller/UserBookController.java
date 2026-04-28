package tn.epac.eprinting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tn.epac.eprinting.model.dtos.BookRequestDto;
import tn.epac.eprinting.model.dtos.BookResponseDto;
import tn.epac.eprinting.model.dtos.UserBookUpsertResultDto;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.service.AdminBookService;

import java.util.List;

@RestController
@RequestMapping("/api/user/books")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('user','admin','organization')")
public class UserBookController {

    private final AdminBookService adminBookService;
    private final BookRepository bookRepository;
    private final OrderRepository orderRepository;

    @PostMapping
    public ResponseEntity<BookResponseDto> createUserBook(
            @Valid @RequestBody BookRequestDto bookRequest,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long creatorUserId = extractUserId(jwt);
        BookResponseDto createdBook = adminBookService.createUserBook(bookRequest, creatorUserId);
        return new ResponseEntity<>(createdBook, HttpStatus.CREATED);
    }

    @PutMapping("/my/{bookId}")
    public ResponseEntity<UserBookUpsertResultDto> updateMyCustomBook(
            @PathVariable Long bookId,
            @Valid @RequestBody BookRequestDto bookRequest,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long creatorUserId = extractUserId(jwt);
        assertOwnedCustomBook(bookId, creatorUserId);
        return ResponseEntity.ok(adminBookService.updateUserBook(bookId, bookRequest, creatorUserId));
    }

    @PostMapping("/my/{bookId}/duplicate")
    public ResponseEntity<BookResponseDto> duplicateMyCustomBook(
            @PathVariable Long bookId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long creatorUserId = extractUserId(jwt);
        assertOwnedCustomBook(bookId, creatorUserId);
        BookResponseDto duplicated = adminBookService.duplicateUserBook(bookId, creatorUserId);
        return new ResponseEntity<>(duplicated, HttpStatus.CREATED);
    }

    @DeleteMapping("/my/{bookId}")
    public ResponseEntity<Void> deleteMyCustomBook(
            @PathVariable Long bookId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long creatorUserId = extractUserId(jwt);
        Book book = assertOwnedCustomBook(bookId, creatorUserId);

        if (orderRepository.existsByOrderLinesBookBookId(bookId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete book associated to order"
            );
        }

        bookRepository.delete(book);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookResponseDto>> getMyCustomBooks(@AuthenticationPrincipal Jwt jwt) {
        Long creatorUserId = extractUserId(jwt);
        return ResponseEntity.ok(adminBookService.getUserCreatedBooks(creatorUserId));
    }

    @GetMapping("/my/{bookId}")
    public ResponseEntity<BookResponseDto> getMyCustomBookById(
            @PathVariable Long bookId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long creatorUserId = extractUserId(jwt);
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        if (!book.is_created_by_user()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This book is not a custom book");
        }
        if (book.getCreation_author() == null || creatorUserId == null || !creatorUserId.equals(book.getCreation_author().getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this book");
        }

        return ResponseEntity.ok(adminBookService.getBookById(bookId));
    }

    @GetMapping("/my/{bookId}/cover-pdf")
    public ResponseEntity<Resource> getMyCustomBookCoverPdf(
            @PathVariable Long bookId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "download", defaultValue = "false") boolean download
    ) {
        Book book = assertOwnedCustomBook(bookId, extractUserId(jwt));
        String filePath = book.getCover() != null ? book.getCover().getPdfFilePath() : null;
        String fileName = book.getCover() != null ? book.getCover().getPdfFileName() : null;
        return servePdfFile(filePath, fileName, download);
    }

    @GetMapping("/my/{bookId}/content-pdf")
    public ResponseEntity<Resource> getMyCustomBookContentPdf(
            @PathVariable Long bookId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "download", defaultValue = "false") boolean download,
            @RequestParam(name = "preview", defaultValue = "false") boolean preview
    ) {
        Book book = assertOwnedCustomBook(bookId, extractUserId(jwt));
        String filePath = book.getContent() != null ? book.getContent().getFilePath() : null;
        String fileName = book.getContent() != null ? book.getContent().getFileName() : null;
        // NOTE: preview currently streams the same PDF and relies on the browser viewer.
        // A first-10-pages extraction can be added later with PDFBox if needed.
        return servePdfFile(filePath, fileName, download && !preview);
    }

    private Book assertOwnedCustomBook(Long bookId, Long creatorUserId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        if (!book.is_created_by_user()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This book is not a custom book");
        }
        if (book.getCreation_author() == null || creatorUserId == null || !creatorUserId.equals(book.getCreation_author().getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this book");
        }
        return book;
    }

    private ResponseEntity<Resource> servePdfFile(String rawPath, String fileName, boolean asAttachment) {
        if (rawPath == null || rawPath.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "PDF file not found");
        }

        if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.LOCATION, rawPath);
            return new ResponseEntity<>(headers, HttpStatus.TEMPORARY_REDIRECT);
        }

        Path path = Paths.get(rawPath).normalize();
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "PDF file not found");
        }

        Resource resource = new FileSystemResource(path);
        String resolvedName = (fileName == null || fileName.isBlank()) ? path.getFileName().toString() : fileName;
        String disposition = (asAttachment ? "attachment" : "inline") + "; filename=\"" + resolvedName + "\"";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
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
