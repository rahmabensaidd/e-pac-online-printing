package tn.epac.eprinting.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.epac.eprinting.model.dtos.BookOverviewDto;
import tn.epac.eprinting.model.dtos.BookRequestDto;
import tn.epac.eprinting.model.dtos.BookResponseDto;
import tn.epac.eprinting.model.dtos.UserBookUpsertResultDto;
import tn.epac.eprinting.model.enums.AdminBookStatus;

import java.util.List;

public interface AdminBookService {

/** Retrieves global book statistics
     * @return DTO containing statistics (total count, low stock, etc.)
     */
    BookOverviewDto getBookOverview();

    /**
     * Retrieves all books with pagination and optional filters
     * @param pageable Pagination information
     * @param search Search term (title or description)
     * @param status Filter by stock status
     * @param bindingType Filter by binding type
     * @return Page of books
     */
    Page<BookResponseDto> getAllBooks(Pageable pageable, String search, AdminBookStatus status, String bindingType);

    /**
     * Retrieves books visible in the marketplace.
     * Only books added by admins should be returned.
     * @param pageable Pagination information
     * @param search Search term (title or description)
     * @return Page of marketplace books
     */
    /**
     *
     * @param pageable
     * @param search
     * @return
     */
    Page<BookResponseDto> getMarketplaceBooks(Pageable pageable, String search);

    /**
     * Retrieves a book by its ID
     * @param bookId Book identifier
     * @return DTO of the found book
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    BookResponseDto getBookById(Long bookId);

    /**
     * Creates a new book
     * @param bookRequest DTO containing book information to create
     * @return DTO of the created book
     */
    BookResponseDto createBook(BookRequestDto bookRequest);

    /**
     * Creates a new book from a logged-in user flow (non-admin creation path).
     * @param bookRequest DTO containing book information to create
     * @param creatorUserId authenticated user id from JWT
     * @return DTO of the created book
     */
    BookResponseDto createUserBook(BookRequestDto bookRequest, Long creatorUserId);

    /**
     * Retrieves books created by the authenticated user.
     * @param creatorUserId authenticated user id
     * @return list of user's custom books
     */
    List<BookResponseDto> getUserCreatedBooks(Long creatorUserId);

    /**
     * Duplicates an existing custom book into a brand new editable instance for the same user.
     * @param bookId source custom book id
     * @param creatorUserId authenticated owner id
     * @return duplicated custom book
     */
    BookResponseDto duplicateUserBook(Long bookId, Long creatorUserId);

    /**
     * Updates a custom user book in place if it is not linked to any order.
     * If the book is already linked to an order, creates a new custom book instance instead.
     * @param bookId existing custom book id
     * @param bookRequest updated payload
     * @param creatorUserId authenticated owner id
     * @return upsert result with strategy metadata
     */
    UserBookUpsertResultDto updateUserBook(Long bookId, BookRequestDto bookRequest, Long creatorUserId);

    /**
     * Updates an existing book (full replacement)
     * @param bookId Book identifier to update
     * @param bookRequest DTO containing new information
     * @return DTO of the updated book
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    BookResponseDto updateBook(Long bookId, BookRequestDto bookRequest);

    /**
     * Partially updates an existing book
     * @param bookId Book identifier to update
     * @param bookRequest DTO containing fields to modify
     * @return DTO of the updated book
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    BookResponseDto patchBook(Long bookId, BookRequestDto bookRequest);

    /**
     * Deletes a book
     * @param bookId Book identifier to delete
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    void deleteBook(Long bookId);

    /**
     * Updates a book's stock quantity
     * @param bookId Book identifier
     * @param quantity New quantity
     * @return DTO of the updated book
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    BookResponseDto updateStock(Long bookId, Integer quantity);

    /**
     * Retrieves all low stock books (quantity < 10)
     * @return List of low stock books
     */
    List<BookResponseDto> getLowStockBooks();

    /**
     * Retrieves books by binding type
     * @param bindingType Binding type
     * @return List of matching books
     */
    List<BookResponseDto> getBooksByBindingType(String bindingType);

    /**
     * Checks if a book exists
     * @param bookId Book identifier
     * @return true if the book exists, false otherwise
     */
    boolean existsBookById(Long bookId);

    /**
     * Retrieves available stock of a book
     * @param bookId Book identifier
     * @return Available quantity
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    Integer getBookStock(Long bookId);

    /**
     * Activates or deactivates a book (soft delete)
     * @param bookId Book identifier
     * @param active Activation status
     * @return DTO of the updated book
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    BookResponseDto toggleBookStatus(Long bookId, boolean active);

    /**
     * Advanced book search with multiple criteria
     * @param title Title (optional)
     * @param author Author (optional)
     * @param minPrice Minimum price (optional)
     * @param maxPrice Maximum price (optional)
     * @param bindingType Binding type (optional)
     * @param pageable Pagination information
     * @return Page of books matching the criteria
     */
    Page<BookResponseDto> searchBooks(String title, String author, Float minPrice,
                                      Float maxPrice, String bindingType, Pageable pageable);

    /**
     * Updates a book's sale price
     * @param bookId Book identifier
     * @param newPrice New price
     * @return DTO of the updated book
     * @throws tn.epac.eprinting.exception.ResourceNotFoundException if the book does not exist
     */
    BookResponseDto updateBookPrice(Long bookId, Float newPrice);

    /**
     * Retrieves books by status
     * @param status Book status (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)
     * @param pageable Pagination information
     * @return Page of books
     */
    Page<BookResponseDto> getBooksByStatus(AdminBookStatus status, Pageable pageable);

    /**
     * Validates book information before creation/update
     * @param bookRequest DTO to validate
     * @return true if valid, false otherwise
     */
    boolean validateBookData(BookRequestDto bookRequest);
}
