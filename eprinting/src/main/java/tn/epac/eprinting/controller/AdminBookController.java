package tn.epac.eprinting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.web.bind.annotation.*;
import tn.epac.eprinting.model.dtos.BookRequestDto;
import tn.epac.eprinting.model.dtos.BookResponseDto;
import tn.epac.eprinting.model.dtos.BookOverviewDto;
import tn.epac.eprinting.model.enums.AdminBookStatus;
import tn.epac.eprinting.service.AdminBookService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/books")
@RequiredArgsConstructor
//@PreAuthorize("hasRole('ADMIN')")
public class AdminBookController {

    private final AdminBookService adminBookService;

    /**
     * Get book overview statistics
     */
    @GetMapping("/overview")
    public ResponseEntity<BookOverviewDto> getBookOverview() {
        BookOverviewDto overview = adminBookService.getBookOverview();
        return ResponseEntity.ok(overview);
    }

    /**
     * Get all books with pagination and filtering
     */
    @GetMapping
    public ResponseEntity<Page<BookResponseDto>> getAllBooks(
            @PageableDefault(size = 10, sort = "bookId") Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) AdminBookStatus status,
            @RequestParam(required = false) String bindingType
    ) {
        Page<BookResponseDto> books = adminBookService.getAllBooks(pageable, search, status, bindingType);
        return ResponseEntity.ok(books);
    }

    /**
     * Get book by ID
     */
    @GetMapping("/{bookId}")
    public ResponseEntity<BookResponseDto> getBookById(@PathVariable Long bookId) {
        BookResponseDto book = adminBookService.getBookById(bookId);
        return ResponseEntity.ok(book);
    }

    /**
     * Create new book
     */
    @PostMapping
    public ResponseEntity<BookResponseDto> createBook(@Valid @RequestBody BookRequestDto bookRequest) {
        BookResponseDto createdBook = adminBookService.createBook(bookRequest);
        return new ResponseEntity<>(createdBook, HttpStatus.CREATED);
    }

    /**
     * Update existing book
     */
    @PutMapping("/{bookId}")
    public ResponseEntity<BookResponseDto> updateBook(
            @PathVariable Long bookId,
            @Valid @RequestBody BookRequestDto bookRequest
    ) {
        BookResponseDto updatedBook = adminBookService.updateBook(bookId, bookRequest);
        return ResponseEntity.ok(updatedBook);
    }

    /**
     * Partially update book
     */
    @PatchMapping("/{bookId}")
    public ResponseEntity<BookResponseDto> patchBook(
            @PathVariable Long bookId,
            @RequestBody BookRequestDto bookRequest
    ) {
        BookResponseDto updatedBook = adminBookService.patchBook(bookId, bookRequest);
        return ResponseEntity.ok(updatedBook);
    }

    /**
     * Delete book
     */
    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long bookId) {
        adminBookService.deleteBook(bookId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Update book stock
     */
    @PatchMapping("/{bookId}/stock")
    public ResponseEntity<BookResponseDto> updateStock(
            @PathVariable Long bookId,
            @RequestParam Integer quantity
    ) {
        BookResponseDto updatedBook = adminBookService.updateStock(bookId, quantity);
        return ResponseEntity.ok(updatedBook);
    }

    /**
     * Get low stock books
     */
    @GetMapping("/low-stock")
    public ResponseEntity<List<BookResponseDto>> getLowStockBooks() {
        List<BookResponseDto> lowStockBooks = adminBookService.getLowStockBooks();
        return ResponseEntity.ok(lowStockBooks);
    }

    /**
     * Get books by binding type
     */
    @GetMapping("/binding/{bindingType}")
    public ResponseEntity<List<BookResponseDto>> getBooksByBindingType(@PathVariable String bindingType) {
        List<BookResponseDto> books = adminBookService.getBooksByBindingType(bindingType);
        return ResponseEntity.ok(books);
    }
}