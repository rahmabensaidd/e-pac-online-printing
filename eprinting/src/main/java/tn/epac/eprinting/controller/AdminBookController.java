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
import tn.epac.eprinting.service.AdminBookService;  // Use interface instead of implementation

import java.util.List;

@RestController
@RequestMapping("/api/admin/books")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")  // Uncomment and ensure role is correct
public class AdminBookController {

    private final AdminBookService adminBookService;  // Use interface type

    /**
     * Get book overview statistics
     * GET /api/admin/books/overview
     */
    @GetMapping("/overview")
    public ResponseEntity<BookOverviewDto> getBookOverview() {
        BookOverviewDto overview = adminBookService.getBookOverview();
        return ResponseEntity.ok(overview);
    }

    /**
     * Get all books with pagination and filtering
     * GET /api/admin/books?search=...&status=...&bindingType=...
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
     * GET /api/admin/books/{bookId}
     */
    @GetMapping("/{bookId}")
    public ResponseEntity<BookResponseDto> getBookById(@PathVariable Long bookId) {
        BookResponseDto book = adminBookService.getBookById(bookId);
        return ResponseEntity.ok(book);
    }

    /**
     * Create new book
     * POST /api/admin/books
     */
    @PostMapping
    public ResponseEntity<BookResponseDto> createBook(@Valid @RequestBody BookRequestDto bookRequest) {
        BookResponseDto createdBook = adminBookService.createBook(bookRequest);
        return new ResponseEntity<>(createdBook, HttpStatus.CREATED);
    }

    /**
     * Update existing book (full update)
     * PUT /api/admin/books/{bookId}
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
     * PATCH /api/admin/books/{bookId}
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
     * DELETE /api/admin/books/{bookId}
     */
    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long bookId) {
        adminBookService.deleteBook(bookId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Update book stock
     * PATCH /api/admin/books/{bookId}/stock?quantity={quantity}
     */
    @PatchMapping("/{bookId}/stock")
    public ResponseEntity<BookResponseDto> updateStock(
            @PathVariable Long bookId,
            @RequestParam @Valid Integer quantity  // Add validation
    ) {
        BookResponseDto updatedBook = adminBookService.updateStock(bookId, quantity);
        return ResponseEntity.ok(updatedBook);
    }

    /**
     * Get low stock books (quantity < 10)
     * GET /api/admin/books/low-stock
     */
    @GetMapping("/low-stock")
    public ResponseEntity<List<BookResponseDto>> getLowStockBooks() {
        List<BookResponseDto> lowStockBooks = adminBookService.getLowStockBooks();
        return ResponseEntity.ok(lowStockBooks);
    }

    /**
     * Get books by binding type
     * GET /api/admin/books/binding/{bindingType}
     */
    @GetMapping("/binding/{bindingType}")
    public ResponseEntity<List<BookResponseDto>> getBooksByBindingType(
            @PathVariable String bindingType,
            @PageableDefault(size = 20) Pageable pageable  // Add pagination support
    ) {
        // Consider adding pagination for better performance
        List<BookResponseDto> books = adminBookService.getBooksByBindingType(bindingType);
        return ResponseEntity.ok(books);
    }

    /**
     * Search books with advanced criteria
     * GET /api/admin/books/search?title=...&author=...&minPrice=...&maxPrice=...&bindingType=...
     */
    @GetMapping("/search")
    public ResponseEntity<Page<BookResponseDto>> searchBooks(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) Float minPrice,
            @RequestParam(required = false) Float maxPrice,
            @RequestParam(required = false) String bindingType,
            @PageableDefault(size = 10, sort = "title") Pageable pageable
    ) {
        Page<BookResponseDto> books = adminBookService.searchBooks(
                title, author, minPrice, maxPrice, bindingType, pageable);
        return ResponseEntity.ok(books);
    }

    /**
     * Update book price
     * PATCH /api/admin/books/{bookId}/price?newPrice={price}
     */
    @PatchMapping("/{bookId}/price")
    public ResponseEntity<BookResponseDto> updateBookPrice(
            @PathVariable Long bookId,
            @RequestParam @Valid Float newPrice  // Add validation
    ) {
        BookResponseDto updatedBook = adminBookService.updateBookPrice(bookId, newPrice);
        return ResponseEntity.ok(updatedBook);
    }

    /**
     * Get books by stock status
     * GET /api/admin/books/status/{status}
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<Page<BookResponseDto>> getBooksByStatus(
            @PathVariable AdminBookStatus status,
            @PageableDefault(size = 10, sort = "bookId") Pageable pageable
    ) {
        Page<BookResponseDto> books = adminBookService.getBooksByStatus(status, pageable);
        return ResponseEntity.ok(books);
    }

    /**
     * Toggle book active status (soft delete)
     * PATCH /api/admin/books/{bookId}/toggle?active={true/false}
     */
    @PatchMapping("/{bookId}/toggle")
    public ResponseEntity<BookResponseDto> toggleBookStatus(
            @PathVariable Long bookId,
            @RequestParam boolean active
    ) {
        BookResponseDto updatedBook = adminBookService.toggleBookStatus(bookId, active);
        return ResponseEntity.ok(updatedBook);
    }

    /**
     * Check if book exists
     * GET /api/admin/books/{bookId}/exists
     */
    @GetMapping("/{bookId}/exists")
    public ResponseEntity<Boolean> existsBookById(@PathVariable Long bookId) {
        boolean exists = adminBookService.existsBookById(bookId);
        return ResponseEntity.ok(exists);
    }

    /**
     * Get book stock
     * GET /api/admin/books/{bookId}/stock
     */
    @GetMapping("/{bookId}/stock")
    public ResponseEntity<Integer> getBookStock(@PathVariable Long bookId) {
        Integer stock = adminBookService.getBookStock(bookId);
        return ResponseEntity.ok(stock);
    }
}