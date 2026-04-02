package tn.epac.eprinting.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.BookRequestDto;
import tn.epac.eprinting.model.dtos.BookResponseDto;
import tn.epac.eprinting.model.dtos.BookOverviewDto;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.AdminBookStatus;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminBookService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;

    /**
     * Get book overview statistics
     */
    public BookOverviewDto getBookOverview() {
        List<Book> allBooks = bookRepository.findAll();

        long totalBooks = allBooks.size();
        long lowStockCount = allBooks.stream()
                .filter(book -> book.getQuantity() != null && book.getQuantity() < 10)
                .count();

        // Calculate average coverage in days (based on stock / average daily demand)
        double avgCoverageDays = allBooks.stream()
                .filter(book -> book.getQuantity() != null && book.getQuantity() > 0)
                .mapToDouble(book -> calculateCoverageDays(book))
                .average()
                .orElse(0.0);

        long incomingUnits = allBooks.stream()
                .mapToLong(book -> book.getQuantity() != null ? book.getQuantity() : 0)
                .sum();

        return BookOverviewDto.builder()
                .totalBooks(totalBooks)
                .lowStockBooks(lowStockCount)
                .avgCoverageDays(Math.round(avgCoverageDays))
                .incomingUnits(incomingUnits)
                .build();
    }

    /**
     * Get all books with pagination
     */
    public Page<BookResponseDto> getAllBooks(Pageable pageable, String search, AdminBookStatus status, String bindingType) {
        Page<Book> books;

        if (search != null && !search.isEmpty()) {
            books = bookRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                    search, search, pageable);
        }
        else if (bindingType != null && !bindingType.isEmpty()) {
            books = bookRepository.findByBindingType(bindingType, pageable);
        } else {
            books = bookRepository.findAll(pageable);
        }

        return books.map(this::mapToResponseDto);
    }

    /**
     * Get book by ID
     */
    public BookResponseDto getBookById(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        return mapToResponseDto(book);
    }

    /**
     * Create new book
     */
    public BookResponseDto createBook(BookRequestDto bookRequest) {
        Book book = mapToEntity(bookRequest);

        // Set admin-specific fields
        book.set_added_from_admin(true);
        book.setStock_status(AdminBookStatus.IN_STOCK);
        book.set_created_by_user(false);

        Book savedBook = bookRepository.save(book);
        return mapToResponseDto(savedBook);
    }

    /**
     * Update existing book
     */
    public BookResponseDto updateBook(Long bookId, BookRequestDto bookRequest) {
        Book existingBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        updateEntityFromDto(existingBook, bookRequest);

        // Update stock status based on quantity
        updateStockStatus(existingBook);

        Book updatedBook = bookRepository.save(existingBook);
        return mapToResponseDto(updatedBook);
    }

    /**
     * Partially update book
     */
    public BookResponseDto patchBook(Long bookId, BookRequestDto bookRequest) {
        Book existingBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        patchEntityFromDto(existingBook, bookRequest);
        updateStockStatus(existingBook);

        Book updatedBook = bookRepository.save(existingBook);
        return mapToResponseDto(updatedBook);
    }

    /**
     * Delete book
     */
    public void deleteBook(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        bookRepository.delete(book);
    }

    /**
     * Update book stock
     */
    public BookResponseDto updateStock(Long bookId, Integer quantity) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        book.setQuantity(quantity);
        updateStockStatus(book);

        Book updatedBook = bookRepository.save(book);
        return mapToResponseDto(updatedBook);
    }

    /**
     * Get low stock books (quantity < 10)
     */
    public List<BookResponseDto> getLowStockBooks() {
        return bookRepository.findByQuantityLessThan(10)
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    /**
     * Get books by binding type
     */
    public List<BookResponseDto> getBooksByBindingType(String bindingType) {
        return bookRepository.findByBindingType(bindingType, Pageable.unpaged())
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    // Helper methods

    private double calculateCoverageDays(Book book) {
        // Simplified calculation - assume average daily demand of 1 unit
        // In real implementation, this would consider historical sales data
        return book.getQuantity() != null ? book.getQuantity().doubleValue() : 0;
    }

    private void updateStockStatus(Book book) {
        if (book.getQuantity() == null || book.getQuantity() <= 0) {
            book.setStock_status(AdminBookStatus.OUT_OF_STOCK);
        } else if (book.getQuantity() < 10) {
            book.setStock_status(AdminBookStatus.IN_STOCK);
        } else {
            book.setStock_status(AdminBookStatus.IN_STOCK);
        }
    }

    private Book mapToEntity(BookRequestDto dto) {
        return Book.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .pageCount(dto.getPageCount())
                .salePrice(dto.getSalePrice())
                .quantity(dto.getQuantity())
                .height(dto.getHeight())
                .thickness(dto.getThickness())
                .width(dto.getWidth())
                .securityLabel(dto.getSecurityLabel())
                .hasCoil(dto.getHasCoil())
                .hasInsert(dto.getHasInsert())
                .hasTab(dto.getHasTab())
                .hasBackcover(dto.getHasBackcover())
                .perf(dto.getPerf())
                .doubleSidedCover(dto.getDoubleSidedCover())
                .shrinkwrap(dto.getShrinkwrap())
                .threeHoleDrill(dto.getThreeHoleDrill())
                .textPaperType(dto.getTextPaperType())
                .textColor(dto.getTextColor())
                .coverFinishType(dto.getCoverFinishType())
                .coverColor(dto.getCoverColor())
                .coverSize(dto.getCoverSize())
                .coverPaperType(dto.getCoverPaperType())
                .headAndTail(dto.getHeadAndTail())
                .priorityLevel(dto.getPriorityLevel())
                .bindingType(dto.getBindingType())
                .coilType(dto.getCoilType())
                .tabColor(dto.getTabColor())
                .insertPaperType(dto.getInsertPaperType())
                .caseFinishType(dto.getCaseFinishType())
                .spineType(dto.getSpineType())
                .labelType(dto.getLabelType())
                .siren(dto.getSiren())
                .authors(dto.getAuthors().toArray(new String[0]))
                .build();
    }

    private void updateEntityFromDto(Book book, BookRequestDto dto) {
        if (dto.getTitle() != null) book.setTitle(dto.getTitle());
        if (dto.getDescription() != null) book.setDescription(dto.getDescription());
        if (dto.getPageCount() != null) book.setPageCount(dto.getPageCount());
        if (dto.getSalePrice() != null) book.setSalePrice(dto.getSalePrice());
        if (dto.getQuantity() != null) book.setQuantity(dto.getQuantity());
        if (dto.getHeight() != null) book.setHeight(dto.getHeight());
        if (dto.getThickness() != null) book.setThickness(dto.getThickness());
        if (dto.getWidth() != null) book.setWidth(dto.getWidth());
        if (dto.getSecurityLabel() != null) book.setSecurityLabel(dto.getSecurityLabel());
        if (dto.getHasCoil() != null) book.setHasCoil(dto.getHasCoil());
        if (dto.getHasInsert() != null) book.setHasInsert(dto.getHasInsert());
        if (dto.getHasTab() != null) book.setHasTab(dto.getHasTab());
        if (dto.getHasBackcover() != null) book.setHasBackcover(dto.getHasBackcover());
        if (dto.getPerf() != null) book.setPerf(dto.getPerf());
        if (dto.getDoubleSidedCover() != null) book.setDoubleSidedCover(dto.getDoubleSidedCover());
        if (dto.getShrinkwrap() != null) book.setShrinkwrap(dto.getShrinkwrap());
        if (dto.getThreeHoleDrill() != null) book.setThreeHoleDrill(dto.getThreeHoleDrill());
        if (dto.getTextPaperType() != null) book.setTextPaperType(dto.getTextPaperType());
        if (dto.getTextColor() != null) book.setTextColor(dto.getTextColor());
        if (dto.getCoverFinishType() != null) book.setCoverFinishType(dto.getCoverFinishType());
        if (dto.getCoverColor() != null) book.setCoverColor(dto.getCoverColor());
        if (dto.getCoverSize() != null) book.setCoverSize(dto.getCoverSize());
        if (dto.getCoverPaperType() != null) book.setCoverPaperType(dto.getCoverPaperType());
        if (dto.getHeadAndTail() != null) book.setHeadAndTail(dto.getHeadAndTail());
        if (dto.getPriorityLevel() != null) book.setPriorityLevel(dto.getPriorityLevel());
        if (dto.getBindingType() != null) book.setBindingType(dto.getBindingType());
        if (dto.getCoilType() != null) book.setCoilType(dto.getCoilType());
        if (dto.getTabColor() != null) book.setTabColor(dto.getTabColor());
        if (dto.getInsertPaperType() != null) book.setInsertPaperType(dto.getInsertPaperType());
        if (dto.getCaseFinishType() != null) book.setCaseFinishType(dto.getCaseFinishType());
        if (dto.getSpineType() != null) book.setSpineType(dto.getSpineType());
        if (dto.getLabelType() != null) book.setLabelType(dto.getLabelType());
        if (dto.getSiren() != null) book.setSiren(dto.getSiren());
        if (dto.getAuthors() != null) book.setAuthors(dto.getAuthors().toArray(new String[0]));

    }

    private void patchEntityFromDto(Book book, BookRequestDto dto) {
        // Similar to updateEntityFromDto but only apply non-null values
        updateEntityFromDto(book, dto);
    }

    private BookResponseDto mapToResponseDto(Book book) {
        return BookResponseDto.builder()
                .bookId(book.getBookId())
                .title(book.getTitle())
                .description(book.getDescription())
                .pageCount(book.getPageCount())
                .salePrice(book.getSalePrice())
                .quantity(book.getQuantity())
                .height(book.getHeight())
                .thickness(book.getThickness())
                .width(book.getWidth())
                .securityLabel(book.getSecurityLabel())
                .hasCoil(book.getHasCoil())
                .hasInsert(book.getHasInsert())
                .hasTab(book.getHasTab())
                .hasBackcover(book.getHasBackcover())
                .perf(book.getPerf())
                .doubleSidedCover(book.getDoubleSidedCover())
                .shrinkwrap(book.getShrinkwrap())
                .threeHoleDrill(book.getThreeHoleDrill())
                .textPaperType(book.getTextPaperType())
                .textColor(book.getTextColor())
                .coverFinishType(book.getCoverFinishType())
                .coverColor(book.getCoverColor())
                .coverSize(book.getCoverSize())
                .coverPaperType(book.getCoverPaperType())
                .headAndTail(book.getHeadAndTail())
                .priorityLevel(book.getPriorityLevel())
                .bindingType(book.getBindingType())
                .coilType(book.getCoilType())
                .tabColor(book.getTabColor())
                .insertPaperType(book.getInsertPaperType())
                .caseFinishType(book.getCaseFinishType())
                .spineType(book.getSpineType())
                .labelType(book.getLabelType())
                .siren(book.getSiren())
                .authors(book.getAuthors())
                .stockStatus(book.getStock_status())
                .build();
    }
}