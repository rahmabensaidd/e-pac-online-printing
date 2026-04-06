package tn.epac.eprinting.serviceimpl;

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
import tn.epac.eprinting.model.enums.*;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.UserRepository;
import tn.epac.eprinting.service.AdminBookService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminBookServiceImpl implements AdminBookService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;

    @Override
    public BookOverviewDto getBookOverview() {
        // Implementation
        List<Book> allBooks = bookRepository.findAll();

        long totalBooks = allBooks.size();
        long lowStockCount = allBooks.stream()
                .filter(book -> book.getQuantity() != null && book.getQuantity() < 10)
                .count();

        double avgCoverageDays = allBooks.stream()
                .filter(book -> book.getQuantity() != null && book.getQuantity() > 0)
                .mapToDouble(this::calculateCoverageDays)
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

    @Override
    public Page<BookResponseDto> getAllBooks(Pageable pageable, String search,
                                             AdminBookStatus status, String bindingType) {
        Page<Book> books;

        if (search != null && !search.isEmpty()) {
            books = bookRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                    search, search, pageable);
        }  else {
            books = bookRepository.findAll(pageable);
        }

        return books.map(this::mapToResponseDto);
    }

    @Override
    public Page<BookResponseDto> getMarketplaceBooks(Pageable pageable, String search) {
        return bookRepository.findMarketplaceBooks(search, pageable)
                .map(this::mapToResponseDto);
    }

    @Override
    public BookResponseDto getBookById(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        return mapToResponseDto(book);
    }

    @Override
    public BookResponseDto createBook(BookRequestDto bookRequest) {
        Book book = mapToEntity(bookRequest);

        book.set_added_from_admin(true);
        book.setStock_status(AdminBookStatus.IN_STOCK);
        book.set_created_by_user(false);

        if (book.getProductionPage() == null) {
            book.setProductionPage(bookRequest.getProductionPage());
        }

        Book savedBook = bookRepository.save(book);
        return mapToResponseDto(savedBook);
    }

    @Override
    public BookResponseDto updateBook(Long bookId, BookRequestDto bookRequest) {
        Book existingBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        updateEntityFromDto(existingBook, bookRequest);
        updateStockStatus(existingBook);

        Book updatedBook = bookRepository.save(existingBook);
        return mapToResponseDto(updatedBook);
    }

    @Override
    public BookResponseDto patchBook(Long bookId, BookRequestDto bookRequest) {
        Book existingBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        patchEntityFromDto(existingBook, bookRequest);
        updateStockStatus(existingBook);

        Book updatedBook = bookRepository.save(existingBook);
        return mapToResponseDto(updatedBook);
    }

    @Override
    public void deleteBook(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        bookRepository.delete(book);
    }

    @Override
    public BookResponseDto updateStock(Long bookId, Integer quantity) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        book.setQuantity(quantity);
        updateStockStatus(book);

        Book updatedBook = bookRepository.save(book);
        return mapToResponseDto(updatedBook);
    }

    @Override
    public List<BookResponseDto> getLowStockBooks() {
        return bookRepository.findByQuantityLessThan(10)
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<BookResponseDto> getBooksByBindingType(String bindingType) {
        return List.of();
    }


    @Override
    public boolean existsBookById(Long bookId) {
        return bookRepository.existsById(bookId);
    }

    @Override
    public Integer getBookStock(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        return book.getQuantity();
    }

    @Override
    public BookResponseDto toggleBookStatus(Long bookId, boolean active) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        // Uncomment if you have an 'active' field in your entity
        // book.setActive(active);

        Book updatedBook = bookRepository.save(book);
        return mapToResponseDto(updatedBook);
    }

    @Override
    public Page<BookResponseDto> searchBooks(String title, String author, Float minPrice,
                                             Float maxPrice, String bindingType, Pageable pageable) {
        Page<Book> books = bookRepository.searchBooks(title, author, minPrice, maxPrice,
                bindingType != null ? BindingType.valueOf(bindingType) : null,
                pageable);
        return books.map(this::mapToResponseDto);
    }

    @Override
    public BookResponseDto updateBookPrice(Long bookId, Float newPrice) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        book.setSalePrice(newPrice);
        Book updatedBook = bookRepository.save(book);
        return mapToResponseDto(updatedBook);
    }

    @Override
    public Page<BookResponseDto> getBooksByStatus(AdminBookStatus status, Pageable pageable) {
        return null;
    }


    @Override
    public boolean validateBookData(BookRequestDto bookRequest) {
        if (bookRequest == null) {
            return false;
        }

        // Required field validation
        if (bookRequest.getTitle() == null || bookRequest.getTitle().trim().isEmpty()) {
            return false;
        }

        if (bookRequest.getAuthors() == null || bookRequest.getAuthors().isEmpty()) {
            return false;
        }

        if (bookRequest.getQuantity() == null || bookRequest.getQuantity() < 0) {
            return false;
        }

        if (bookRequest.getProductionPage() == null || bookRequest.getProductionPage() <= 0) {
            return false;
        }

        if (bookRequest.getSalePrice() == null || bookRequest.getSalePrice() <= 0) {
            return false;
        }

        // Enum validation
        try {
            if (bookRequest.getBindingType() != null) {
                BindingType.valueOf(bookRequest.getBindingType());
            }
            if (bookRequest.getCoverColor() != null) {
                CoverColor.valueOf(bookRequest.getCoverColor());
            }
            // Add other enum validations as needed
        } catch (IllegalArgumentException e) {
            return false;
        }

        return true;
    }

    // Helper methods
    private double calculateCoverageDays(Book book) {
        return book.getQuantity() != null ? book.getQuantity().doubleValue() : 0;
    }

    private void updateStockStatus(Book book) {
        if (book.getQuantity() == null || book.getQuantity() <= 0) {
            book.setStock_status(AdminBookStatus.OUT_OF_STOCK);
        } else if (book.getQuantity() < 10) {
            book.setStock_status(AdminBookStatus.LOW_STOCK);
        } else {
            book.setStock_status(AdminBookStatus.IN_STOCK);
        }
    }

    private Book mapToEntity(BookRequestDto dto) {
        // Implementation as before
        return Book.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .productionPage(dto.getProductionPage())
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
                .textPaperType(TextPaperType.valueOf(dto.getTextPaperType()))
                .textColor(TextColor.valueOf(dto.getTextColor()))
                .coverFinishType(CoverFinishType.valueOf(dto.getCoverFinishType()))
                .coverColor(CoverColor.valueOf(dto.getCoverColor()))
                .coverSize(CoverSize.valueOf(dto.getCoverSize()))
                .coverPaperType(CoverPaperType.valueOf(dto.getCoverPaperType()))
                .headAndTail(HeadAndTail.valueOf(dto.getHeadAndTail()))
                .priorityLevel(PriorityLevel.valueOf(dto.getPriorityLevel()))
                .bindingType(BindingType.valueOf(dto.getBindingType()))
                .coilType(dto.getCoilType() != null ? CoilType.valueOf(dto.getCoilType()) : null)
                .tabColor(dto.getTabColor() != null ? TabColor.valueOf(dto.getTabColor()) : null)
                .insertPaperType(dto.getInsertPaperType() != null ? InsertPaperType.valueOf(dto.getInsertPaperType()) : null)
                .caseFinishType(dto.getCaseFinishType() != null ? CaseFinishType.valueOf(dto.getCaseFinishType()) : null)
                .spineType(dto.getSpineType() != null ? SpineType.valueOf(dto.getSpineType()) : null)
                .labelType(dto.getLabelType() != null ? LabelType.valueOf(dto.getLabelType()) : null)
                .siren(dto.getSiren())
                .authors(dto.getAuthors())
                .build();
    }

    private void updateEntityFromDto(Book book, BookRequestDto dto) {
        // Implementation as before
        if (dto.getTitle() != null) book.setTitle(dto.getTitle());
        if (dto.getDescription() != null) book.setDescription(dto.getDescription());
        if (dto.getProductionPage() != null) {

            book.setProductionPage(dto.getProductionPage());
        }
        if (dto.getSalePrice() != null) book.setSalePrice(dto.getSalePrice());
        if (dto.getQuantity() != null) book.setQuantity(dto.getQuantity());
        // ... rest of the implementation
    }

    private void patchEntityFromDto(Book book, BookRequestDto dto) {
        updateEntityFromDto(book, dto);
    }

    private BookResponseDto mapToResponseDto(Book book) {
        // Implementation as before
        return BookResponseDto.builder()
                .bookId(book.getBookId())
                .title(book.getTitle())
                .description(book.getDescription())
                .productionPage(book.getProductionPage())
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
                .textPaperType(book.getTextPaperType() != null ? book.getTextPaperType().name() : null)
                .textColor(book.getTextColor() != null ? book.getTextColor().name() : null)
                .coverFinishType(book.getCoverFinishType() != null ? book.getCoverFinishType().name() : null)
                .coverColor(book.getCoverColor() != null ? book.getCoverColor().name() : null)
                .coverSize(book.getCoverSize() != null ? book.getCoverSize().name() : null)
                .coverPaperType(book.getCoverPaperType() != null ? book.getCoverPaperType().name() : null)
                .headAndTail(book.getHeadAndTail() != null ? book.getHeadAndTail().name() : null)
                .priorityLevel(book.getPriorityLevel() != null ? book.getPriorityLevel().name() : null)
                .bindingType(book.getBindingType() != null ? book.getBindingType().name() : null)
                .coilType(book.getCoilType() != null ? book.getCoilType().name() : null)
                .tabColor(book.getTabColor() != null ? book.getTabColor().name() : null)
                .insertPaperType(book.getInsertPaperType() != null ? book.getInsertPaperType().name() : null)
                .caseFinishType(book.getCaseFinishType() != null ? book.getCaseFinishType().name() : null)
                .spineType(book.getSpineType() != null ? book.getSpineType().name() : null)
                .labelType(book.getLabelType() != null ? book.getLabelType().name() : null)
                .siren(book.getSiren())
                .authors(book.getAuthors() != null ? book.getAuthors().toArray(new String[0]) : new String[0])
                .isAddedFromAdmin(book.is_added_from_admin())
                .isCreatedByUser(book.is_created_by_user())
                .stockStatus(book.getStock_status())
                .build();
    }
}
