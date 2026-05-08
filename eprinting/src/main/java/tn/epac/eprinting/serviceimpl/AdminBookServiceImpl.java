package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.epac.eprinting.exception.ResourceNotFoundException;
import tn.epac.eprinting.model.dtos.BookOverviewDto;
import tn.epac.eprinting.model.dtos.BookReviewDto;
import tn.epac.eprinting.model.dtos.BookRequestDto;
import tn.epac.eprinting.model.dtos.BookResponseDto;
import tn.epac.eprinting.model.dtos.UserBookUpsertResultDto;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.BookReview;
import tn.epac.eprinting.model.entities.Content;
import tn.epac.eprinting.model.entities.Cover;
import tn.epac.eprinting.model.entities.PnlInformation;
import tn.epac.eprinting.model.entities.PnlLine;
import tn.epac.eprinting.model.enums.AdminBookStatus;
import tn.epac.eprinting.model.enums.BindingType;
import tn.epac.eprinting.model.enums.CaseFinishType;
import tn.epac.eprinting.model.enums.CoilType;
import tn.epac.eprinting.model.enums.CoverColor;
import tn.epac.eprinting.model.enums.CoverFinishType;
import tn.epac.eprinting.model.enums.CoverPaperType;
import tn.epac.eprinting.model.enums.CoverSize;
import tn.epac.eprinting.model.enums.HeadAndTail;
import tn.epac.eprinting.model.enums.InsertPaperType;
import tn.epac.eprinting.model.enums.LabelType;
import tn.epac.eprinting.model.enums.PriorityLevel;
import tn.epac.eprinting.model.enums.TabColor;
import tn.epac.eprinting.model.enums.TextColor;
import tn.epac.eprinting.model.enums.TextPaperType;
import tn.epac.eprinting.model.enums.UserBookStatus;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.BookReviewRepository;
import tn.epac.eprinting.repository.CoverTemplateRepository;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.repository.TextTemplateRepository;
import tn.epac.eprinting.repository.UserRepository;
import tn.epac.eprinting.service.AdminBookService;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminBookServiceImpl implements AdminBookService {
    private static final Path CUSTOM_BOOK_UPLOADS_DIR = Paths.get(System.getProperty("user.dir"), "uploads", "custom-books");

    private final BookRepository bookRepository;
    private final BookReviewRepository bookReviewRepository;
    private final CoverTemplateRepository coverTemplateRepository;
    private final TextTemplateRepository textTemplateRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    @Override
    public BookOverviewDto getBookOverview() {
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
    public Page<BookResponseDto> getAllBooks(Pageable pageable, String search, AdminBookStatus status, String bindingType) {
        BindingType parsedBinding = parseEnum(BindingType.class, bindingType, null);
        Page<Book> books = bookRepository.findAllWithFilters(
                normalizeBlankToNull(search),
                status,
                parsedBinding,
                pageable
        );
        return books.map(this::mapToResponseDto);
    }

    @Override
    public Page<BookResponseDto> getMarketplaceBooks(Pageable pageable, String search) {
        return bookRepository.findMarketplaceBooks(search, pageable).map(this::mapToResponseDto);
    }

    @Override
    public BookResponseDto getBookById(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        return mapToResponseDto(book);
    }

    @Override
    public BookResponseDto createBook(BookRequestDto bookRequest) {
        if (!validateBookData(bookRequest)) {
            throw new IllegalArgumentException("Invalid book request payload");
        }

        Book book = new Book();
        applyBookFields(book, bookRequest, false);
        applyBookRelations(book, bookRequest, false);

        book.set_added_from_admin(true);
        book.set_created_by_user(false);
        book.setUserbook_status(UserBookStatus.PUBLISHED);
        updateStockStatus(book);

        Book savedBook = bookRepository.save(book);
        return mapToResponseDto(savedBook);
    }

    @Override
    public BookResponseDto createUserBook(BookRequestDto bookRequest, Long creatorUserId) {
        if (!validateBookData(bookRequest)) {
            throw new IllegalArgumentException("Invalid book request payload");
        }

        Book book = new Book();
        applyBookFields(book, bookRequest, false);
        applyBookRelations(book, bookRequest, false);

        book.set_added_from_admin(false);
        book.set_created_by_user(true);
        book.setUserbook_status(UserBookStatus.DRAFT);
        if (creatorUserId != null) {
            userRepository.findById(creatorUserId).ifPresent(book::setCreation_author);
        }
        updateStockStatus(book);

        Book savedBook = bookRepository.save(book);
        return mapToResponseDto(savedBook);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookResponseDto> getUserCreatedBooks(Long creatorUserId) {
        if (creatorUserId == null) {
            return List.of();
        }

        return bookRepository.findUserCreatedBooks(creatorUserId)
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public BookResponseDto duplicateUserBook(Long bookId, Long creatorUserId) {
        Book source = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        if (!source.is_created_by_user()) {
            throw new IllegalArgumentException("This book is not a custom user book");
        }
        if (source.getCreation_author() == null
                || creatorUserId == null
                || !creatorUserId.equals(source.getCreation_author().getUserId())) {
            throw new IllegalArgumentException("You do not have access to this book");
        }

        Book clone = new Book();
        clone.setTitle(buildDuplicateTitle(source.getTitle()));
        clone.setDescription(source.getDescription());
        clone.setAuthors(source.getAuthors() == null ? new ArrayList<>() : new ArrayList<>(source.getAuthors()));
        clone.setQuantity(source.getQuantity());
        clone.setProductionPage(source.getProductionPage());
        clone.setHeight(source.getHeight());
        clone.setThickness(source.getThickness());
        clone.setWidth(source.getWidth());
        clone.setSecurityLabel(source.getSecurityLabel());
        clone.setHasCoil(source.getHasCoil());
        clone.setHasInsert(source.getHasInsert());
        clone.setHasTab(source.getHasTab());
        clone.setHasBackcover(source.getHasBackcover());
        clone.setPerf(source.getPerf());
        clone.setDoubleSidedCover(source.getDoubleSidedCover());
        clone.setShrinkwrap(source.getShrinkwrap());
        clone.setThreeHoleDrill(source.getThreeHoleDrill());
        clone.setPnlCover(source.getPnlCover());
        clone.setPnlText(source.getPnlText());
        clone.setTextPaperType(source.getTextPaperType());
        clone.setTextColor(source.getTextColor());
        clone.setCoverFinishType(source.getCoverFinishType());
        clone.setCoverColor(source.getCoverColor());
        clone.setCoverSize(source.getCoverSize());
        clone.setCoverPaperType(source.getCoverPaperType());
        clone.setHeadAndTail(source.getHeadAndTail());
        clone.setBindingType(source.getBindingType());
        clone.setCoilType(source.getCoilType());
        clone.setTabColor(source.getTabColor());
        clone.setInsertPaperType(source.getInsertPaperType());
        clone.setCaseFinishType(source.getCaseFinishType());
        clone.setSpineType(source.getSpineType());
        clone.setLabelType(source.getLabelType());
        clone.setSalePrice(source.getSalePrice());
        clone.setSiren(source.getSiren());

        clone.set_added_from_admin(false);
        clone.set_created_by_user(true);
        clone.setUserbook_status(UserBookStatus.DRAFT);
        userRepository.findById(creatorUserId).ifPresent(clone::setCreation_author);

        if (source.getCover() != null) {
            Cover sourceCover = source.getCover();
            Cover cover = new Cover();
            cover.setTitle(sourceCover.getTitle());
            cover.setPdfFileName(sourceCover.getPdfFileName());
            cover.setPdfFileType(sourceCover.getPdfFileType());
            cover.setPdfFilePath(sourceCover.getPdfFilePath());
            cover.setCoverTemplate(sourceCover.getCoverTemplate());
            cover.setBook(clone);
            clone.setCover(cover);
        }

        if (source.getContent() != null) {
            Content sourceContent = source.getContent();
            Content content = new Content();
            content.setFileName(sourceContent.getFileName());
            content.setFileType(sourceContent.getFileType());
            content.setFilePath(sourceContent.getFilePath());
            content.setTextTemplate(sourceContent.getTextTemplate());
            content.setBook(clone);
            clone.setContent(content);
        }

        if (source.getPnlInformations() != null) {
            List<PnlInformation> pnlCopies = source.getPnlInformations().stream()
                    .filter(Objects::nonNull)
                    .map(info -> {
                        PnlInformation copy = PnlInformation.builder()
                                .pnlPageNumber(info.getPnlPageNumber())
                                .pnlPrintingNumber(info.getPnlPrintingNumber())
                                .pnlHorizontalMargin(info.getPnlHorizontalMargin())
                                .pnlVerticalMargin(info.getPnlVerticalMargin())
                                .pnlLineSpacing(info.getPnlLineSpacing())
                                .pnlFontType(info.getPnlFontType())
                                .pnlFontSize(info.getPnlFontSize())
                                .pnlExcluded(info.getPnlExcluded())
                                .build();
                        if (info.getPnlLines() != null) {
                            info.getPnlLines().stream()
                                    .filter(Objects::nonNull)
                                    .forEach(line -> copy.addLine(
                                            PnlLine.builder()
                                                    .lineId(line.getLineId())
                                                    .ordering(line.getOrdering())
                                                    .value(line.getValue())
                                                    .pnlFontType(line.getPnlFontType())
                                                    .pnlFontSize(line.getPnlFontSize())
                                                    .pnlFontBold(line.getPnlFontBold())
                                                    .pnlFontItalic(line.getPnlFontItalic())
                                                    .build()
                                    ));
                        }
                        return copy;
                    })
                    .toList();
            clone.setPnlInformations(new ArrayList<>(pnlCopies));
        }

        updateStockStatus(clone);
        Book saved = bookRepository.save(clone);
        return mapToResponseDto(saved);
    }

    @Override
    public UserBookUpsertResultDto updateUserBook(Long bookId, BookRequestDto bookRequest, Long creatorUserId) {
        Book existingBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        if (!existingBook.is_created_by_user()) {
            throw new IllegalArgumentException("This book is not a custom user book");
        }
        if (existingBook.getCreation_author() == null
                || creatorUserId == null
                || !creatorUserId.equals(existingBook.getCreation_author().getUserId())) {
            throw new IllegalArgumentException("You do not have access to this book");
        }

        boolean linkedToOrder = orderRepository.existsByOrderLinesBookBookId(bookId);
        if (!linkedToOrder) {
            applyBookFields(existingBook, bookRequest, false);
            applyBookRelations(existingBook, bookRequest, false);
            updateStockStatus(existingBook);

            Book updatedBook = bookRepository.save(existingBook);
            return UserBookUpsertResultDto.builder()
                    .book(mapToResponseDto(updatedBook))
                    .updatedInPlace(true)
                    .cloned(false)
                    .message("Book updated in place.")
                    .build();
        }

        Book clonedBook = new Book();
        applyBookFields(clonedBook, bookRequest, false);
        applyBookRelations(clonedBook, bookRequest, false);
        clonedBook.set_added_from_admin(false);
        clonedBook.set_created_by_user(true);
        clonedBook.setUserbook_status(UserBookStatus.DRAFT);
        if (creatorUserId != null) {
            userRepository.findById(creatorUserId).ifPresent(clonedBook::setCreation_author);
        }
        updateStockStatus(clonedBook);

        Book savedClone = bookRepository.save(clonedBook);
        return UserBookUpsertResultDto.builder()
                .book(mapToResponseDto(savedClone))
                .updatedInPlace(false)
                .cloned(true)
                .message("This book is already linked to an order. A new editable instance was created.")
                .build();
    }

    @Override
    public BookResponseDto updateBook(Long bookId, BookRequestDto bookRequest) {
        Book existingBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        applyBookFields(existingBook, bookRequest, false);
        applyBookRelations(existingBook, bookRequest, false);
        updateStockStatus(existingBook);

        Book updatedBook = bookRepository.save(existingBook);
        return mapToResponseDto(updatedBook);
    }

    @Override
    public BookResponseDto patchBook(Long bookId, BookRequestDto bookRequest) {
        Book existingBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        applyBookFields(existingBook, bookRequest, true);
        applyBookRelations(existingBook, bookRequest, true);
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

        return mapToResponseDto(bookRepository.save(book));
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
        BindingType parsedBinding = parseEnum(BindingType.class, bindingType, null);
        if (parsedBinding == null) {
            return List.of();
        }

        return bookRepository.findByBindingType(parsedBinding)
                .stream()
                .map(this::mapToResponseDto)
                .toList();
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
        if (!active) {
            book.setStock_status(AdminBookStatus.OUT_OF_STOCK);
        } else {
            updateStockStatus(book);
        }
        return mapToResponseDto(bookRepository.save(book));
    }

    @Override
    public Page<BookResponseDto> searchBooks(String title, String author, Float minPrice,
                                             Float maxPrice, String bindingType, Pageable pageable) {
        BindingType parsedBinding = parseEnum(BindingType.class, bindingType, null);
        return bookRepository.searchBooks(title, author, minPrice, maxPrice, parsedBinding, pageable)
                .map(this::mapToResponseDto);
    }

    @Override
    public BookResponseDto updateBookPrice(Long bookId, Float newPrice) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        book.setSalePrice(newPrice);
        return mapToResponseDto(bookRepository.save(book));
    }

    @Override
    public Page<BookResponseDto> getBooksByStatus(AdminBookStatus status, Pageable pageable) {
        return bookRepository.findByStockStatus(status, pageable).map(this::mapToResponseDto);
    }

    @Override
    public boolean validateBookData(BookRequestDto bookRequest) {
        if (bookRequest == null) return false;
        if (bookRequest.getTitle() == null || bookRequest.getTitle().trim().isEmpty()) return false;
        if (bookRequest.getAuthors() == null || bookRequest.getAuthors().isEmpty()) return false;
        if (bookRequest.getQuantity() == null || bookRequest.getQuantity() < 0) return false;
        if (bookRequest.getProductionPage() == null || bookRequest.getProductionPage() <= 0) return false;
        if (bookRequest.getSalePrice() == null || bookRequest.getSalePrice() <= 0) return false;
        return bookRequest.getPnlCover() != null && bookRequest.getPnlText() != null;
    }

    private void applyBookFields(Book book, BookRequestDto dto, boolean partial) {
        if (shouldApply(partial, dto.getTitle())) book.setTitle(dto.getTitle());
        if (shouldApply(partial, dto.getDescription())) book.setDescription(dto.getDescription());
        if (shouldApply(partial, dto.getAuthors())) book.setAuthors(dto.getAuthors());
        if (shouldApply(partial, dto.getQuantity())) book.setQuantity(dto.getQuantity());
        if (shouldApply(partial, dto.getProductionPage())) book.setProductionPage(dto.getProductionPage());
        if (shouldApply(partial, dto.getHeight())) book.setHeight(dto.getHeight());
        if (shouldApply(partial, dto.getThickness())) book.setThickness(dto.getThickness());
        if (shouldApply(partial, dto.getWidth())) book.setWidth(dto.getWidth());
        if (shouldApply(partial, dto.getSecurityLabel())) book.setSecurityLabel(dto.getSecurityLabel());
        if (shouldApply(partial, dto.getHasCoil())) book.setHasCoil(dto.getHasCoil());
        if (shouldApply(partial, dto.getHasInsert())) book.setHasInsert(dto.getHasInsert());
        if (shouldApply(partial, dto.getHasTab())) book.setHasTab(dto.getHasTab());
        if (shouldApply(partial, dto.getHasBackcover())) book.setHasBackcover(dto.getHasBackcover());
        if (shouldApply(partial, dto.getPerf())) book.setPerf(dto.getPerf());
        if (shouldApply(partial, dto.getDoubleSidedCover())) book.setDoubleSidedCover(dto.getDoubleSidedCover());
        if (shouldApply(partial, dto.getShrinkwrap())) book.setShrinkwrap(dto.getShrinkwrap());
        if (shouldApply(partial, dto.getThreeHoleDrill())) book.setThreeHoleDrill(dto.getThreeHoleDrill());
        if (shouldApply(partial, dto.getPnlCover())) book.setPnlCover(dto.getPnlCover());
        if (shouldApply(partial, dto.getPnlText())) book.setPnlText(dto.getPnlText());
        if (shouldApply(partial, dto.getSalePrice())) book.setSalePrice(dto.getSalePrice());
        if (shouldApply(partial, dto.getSiren())) book.setSiren(dto.getSiren());

        if (!partial || dto.getTextPaperType() != null) {
            book.setTextPaperType(parseEnum(TextPaperType.class, dto.getTextPaperType(), TextPaperType.NONE));
        }
        if (!partial || dto.getTextColor() != null) {
            book.setTextColor(parseEnum(TextColor.class, dto.getTextColor(), TextColor.FOUR_FOUR));
        }
        if (!partial || dto.getCoverFinishType() != null) {
            book.setCoverFinishType(parseEnum(CoverFinishType.class, dto.getCoverFinishType(), CoverFinishType.MATT));
        }
        if (!partial || dto.getCoverColor() != null) {
            book.setCoverColor(parseEnum(CoverColor.class, dto.getCoverColor(), CoverColor.FOUR_FOUR));
        }
        if (!partial || dto.getCoverSize() != null) {
            book.setCoverSize(parseEnum(CoverSize.class, dto.getCoverSize(), CoverSize.XL));
        }
        if (!partial || dto.getCoverPaperType() != null) {
            book.setCoverPaperType(parseEnum(CoverPaperType.class, dto.getCoverPaperType(), CoverPaperType.NONE));
        }
        if (!partial || dto.getHeadAndTail() != null) {
            book.setHeadAndTail(parseEnum(HeadAndTail.class, dto.getHeadAndTail(), HeadAndTail.NONE));
        }

        if (!partial || dto.getBindingType() != null) {
            book.setBindingType(parseEnum(BindingType.class, dto.getBindingType(), BindingType.NONE));
        }
        if (!partial || dto.getCoilType() != null) {
            book.setCoilType(parseEnum(CoilType.class, dto.getCoilType(), null));
        }
        if (!partial || dto.getTabColor() != null) {
            book.setTabColor(parseEnum(TabColor.class, dto.getTabColor(), null));
        }
        if (!partial || dto.getInsertPaperType() != null) {
            book.setInsertPaperType(parseEnum(InsertPaperType.class, dto.getInsertPaperType(), null));
        }
        if (!partial || dto.getCaseFinishType() != null) {
            book.setCaseFinishType(parseEnum(CaseFinishType.class, dto.getCaseFinishType(), null));
        }
        if (!partial || dto.getSpineType() != null) {
            book.setSpineType(parseEnum(tn.epac.eprinting.model.enums.SpineType.class, dto.getSpineType(), null));
        }
        if (!partial || dto.getLabelType() != null) {
            book.setLabelType(parseEnum(LabelType.class, dto.getLabelType(), null));
        }
    }

    private void applyBookRelations(Book book, BookRequestDto dto, boolean partial) {
        if (!partial || dto.getCover() != null) {
            applyCover(book, dto.getCover());
        }

        if (!partial || dto.getContent() != null) {
            applyContent(book, dto.getContent());
        }

        if (!partial || dto.getPnlInformations() != null) {
            applyPnlInformations(book, dto.getPnlInformations());
        }
    }

    private void applyCover(Book book, BookRequestDto.CoverPayloadDto coverDto) {
        if (coverDto == null || isCoverEmpty(coverDto)) {
            book.setCover(null);
            return;
        }

        Cover cover = book.getCover() != null ? book.getCover() : new Cover();
        cover.setTitle(normalizeBlankToNull(coverDto.getTitle()));
        String coverFileName = normalizeBlankToNull(coverDto.getPdfFileName());
        String coverFileType = normalizeBlankToNull(coverDto.getPdfFileType());
        String coverFilePath = normalizeBlankToNull(coverDto.getPdfFilePath());
        String coverBase64 = normalizeBlankToNull(coverDto.getPdfFileBase64());
        if (coverBase64 != null) {
            coverFilePath = storePdfFile(coverBase64, coverFileName, "cover");
        }
        cover.setPdfFileName(coverFileName);
        cover.setPdfFileType(coverFileType);
        cover.setPdfFilePath(coverFilePath);
        cover.setBook(book);

        if (coverDto.getCoverTemplateId() != null) {
            cover.setCoverTemplate(
                    coverTemplateRepository.findById(coverDto.getCoverTemplateId()).orElse(null)
            );
        } else {
            cover.setCoverTemplate(null);
        }

        book.setCover(cover);
    }

    private void applyContent(Book book, BookRequestDto.ContentPayloadDto contentDto) {
        if (contentDto == null || isContentEmpty(contentDto)) {
            book.setContent(null);
            return;
        }

        Content content = book.getContent() != null ? book.getContent() : new Content();
        String fileName = normalizeBlankToNull(contentDto.getFileName());
        String fileType = normalizeBlankToNull(contentDto.getFileType());
        String filePath = normalizeBlankToNull(contentDto.getFilePath());
        String fileBase64 = normalizeBlankToNull(contentDto.getFileBase64());
        String textContent = normalizeBlankToNull(contentDto.getTextContent());

        if (fileBase64 != null) {
            filePath = storePdfFile(fileBase64, fileName, "content");
        }

        if (filePath == null && (textContent != null || contentDto.getTextTemplateId() != null)) {
            fileName = fileName != null ? fileName : "generated-from-text.pdf";
            fileType = "application/pdf";
            filePath = "/generated/from-text";
        }

        content.setFileName(fileName);
        content.setFileType(fileType);
        content.setFilePath(filePath);
        content.setBook(book);

        if (contentDto.getTextTemplateId() != null) {
            content.setTextTemplate(
                    textTemplateRepository.findById(contentDto.getTextTemplateId()).orElse(null)
            );
        } else {
            content.setTextTemplate(null);
        }

        book.setContent(content);
    }

    private void applyPnlInformations(Book book, List<BookRequestDto.PnlInformationPayloadDto> pnlInfos) {
        List<PnlInformation> targetInfos = book.getPnlInformations();
        if (targetInfos == null) {
            targetInfos = new ArrayList<>();
            book.setPnlInformations(targetInfos);
        }

        if (pnlInfos == null) {
            targetInfos.clear();
            return;
        }

        List<PnlInformation> mappedInfos = pnlInfos.stream()
                .filter(Objects::nonNull)
                .map(this::mapPnlInformation)
                .toList();
        targetInfos.clear();
        targetInfos.addAll(mappedInfos);
    }

    private PnlInformation mapPnlInformation(BookRequestDto.PnlInformationPayloadDto dto) {
        PnlInformation info = PnlInformation.builder()
                .pnlPageNumber(dto.getPnlPageNumber())
                .pnlPrintingNumber(dto.getPnlPrintingNumber())
                .pnlHorizontalMargin(dto.getPnlHorizontalMargin())
                .pnlVerticalMargin(dto.getPnlVerticalMargin())
                .pnlLineSpacing(dto.getPnlLineSpacing())
                .pnlFontType(dto.getPnlFontType())
                .pnlFontSize(dto.getPnlFontSize())
                .pnlExcluded(dto.getPnlExcluded())
                .build();

        if (dto.getPnlLines() != null) {
            dto.getPnlLines().stream()
                    .filter(Objects::nonNull)
                    .forEach(lineDto -> info.addLine(
                            PnlLine.builder()
                                    .lineId(lineDto.getLineId())
                                    .ordering(lineDto.getOrdering())
                                    .value(lineDto.getValue())
                                    .pnlFontType(lineDto.getPnlFontType())
                                    .pnlFontSize(lineDto.getPnlFontSize())
                                    .pnlFontBold(lineDto.getPnlFontBold())
                                    .pnlFontItalic(lineDto.getPnlFontItalic())
                                    .build()
                    ));
        }
        return info;
    }

    private BookResponseDto mapToResponseDto(Book book) {
        Double averageRating = bookReviewRepository.findAverageRatingByBookId(book.getBookId());
        Long reviewsCount = bookReviewRepository.countByBookBookId(book.getBookId());
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
                .pnlCover(Boolean.TRUE.equals(book.getPnlCover()))
                .pnlText(Boolean.TRUE.equals(book.getPnlText()))
                .textPaperType(book.getTextPaperType() != null ? book.getTextPaperType().name() : null)
                .textColor(book.getTextColor() != null ? book.getTextColor().name() : null)
                .coverFinishType(book.getCoverFinishType() != null ? book.getCoverFinishType().name() : null)
                .coverColor(book.getCoverColor() != null ? book.getCoverColor().name() : null)
                .coverSize(book.getCoverSize() != null ? book.getCoverSize().name() : null)
                .coverPaperType(book.getCoverPaperType() != null ? book.getCoverPaperType().name() : null)
                .headAndTail(book.getHeadAndTail() != null ? book.getHeadAndTail().name() : null)
                .bindingType(book.getBindingType() != null ? book.getBindingType().name() : null)
                .coilType(book.getCoilType() != null ? book.getCoilType().name() : null)
                .tabColor(book.getTabColor() != null ? book.getTabColor().name() : null)
                .insertPaperType(book.getInsertPaperType() != null ? book.getInsertPaperType().name() : null)
                .caseFinishType(book.getCaseFinishType() != null ? book.getCaseFinishType().name() : null)
                .spineType(book.getSpineType() != null ? book.getSpineType().name() : null)
                .labelType(book.getLabelType() != null ? book.getLabelType().name() : null)
                .siren(book.getSiren())
                .authors(book.getAuthors() != null ? book.getAuthors().toArray(new String[0]) : new String[0])
                .creationAuthorUserId(book.getCreation_author() != null ? book.getCreation_author().getUserId() : null)
                .creationAuthorFullName(resolveCreationAuthorFullName(book))
                .creationAuthorEmail(book.getCreation_author() != null ? book.getCreation_author().getEmail() : null)
                .creationDate(book.getCreationDate())
                .updatedAt(book.getUpdatedAt())
                .isAddedFromAdmin(book.is_added_from_admin())
                .isCreatedByUser(book.is_created_by_user())
                .stockStatus(book.getStock_status())
                .averageRating(averageRating != null && averageRating > 0 ? Math.round(averageRating * 10.0) / 10.0 : null)
                .reviewsCount(reviewsCount > 0 ? reviewsCount : null)
                .reviews(mapReviews(bookReviewRepository.findTop2ByBookBookIdOrderByCreatedAtDesc(book.getBookId())))
                .cover(mapCover(book.getCover()))
                .content(mapContent(book.getContent()))
                .pnlInformations(mapPnlInformations(book.getPnlInformations()))
                .build();
    }

    private List<BookReviewDto> mapReviews(List<BookReview> reviews) {
        if (reviews == null) {
            return List.of();
        }
        return reviews.stream()
                .filter(Objects::nonNull)
                .map(review -> BookReviewDto.builder()
                        .reviewId(review.getReviewId())
                        .bookId(review.getBook() != null ? review.getBook().getBookId() : null)
                        .bookTitle(review.getBook() != null ? review.getBook().getTitle() : null)
                        .reviewerName(review.getReviewerName())
                        .reviewerRole(review.getReviewerRole())
                        .rating(review.getRating())
                        .comment(review.getComment())
                        .featured(review.getFeatured())
                        .createdAt(review.getCreatedAt())
                        .build())
                .toList();
    }

    private BookResponseDto.CoverPayloadDto mapCover(Cover cover) {
        if (cover == null) return null;
        return BookResponseDto.CoverPayloadDto.builder()
                .coverId(cover.getCoverId())
                .title(cover.getTitle())
                .pdfFileName(cover.getPdfFileName())
                .pdfFileType(cover.getPdfFileType())
                .pdfFilePath(cover.getPdfFilePath())
                .coverTemplateId(cover.getCoverTemplate() != null ? cover.getCoverTemplate().getTemplateId() : null)
                .coverTemplateThumbnailUrl(cover.getCoverTemplate() != null ? cover.getCoverTemplate().getThumbnailUrl() : null)
                .build();
    }

    private BookResponseDto.ContentPayloadDto mapContent(Content content) {
        if (content == null) return null;
        return BookResponseDto.ContentPayloadDto.builder()
                .contentId(content.getContentId())
                .fileName(content.getFileName())
                .fileType(content.getFileType())
                .filePath(content.getFilePath())
                .textTemplateId(content.getTextTemplate() != null ? content.getTextTemplate().getTemplateId() : null)
                .build();
    }

    private List<BookResponseDto.PnlInformationPayloadDto> mapPnlInformations(List<PnlInformation> pnlInformations) {
        if (pnlInformations == null) return List.of();
        return pnlInformations.stream().map(info ->
                BookResponseDto.PnlInformationPayloadDto.builder()
                        .id(info.getId())
                        .pnlPageNumber(info.getPnlPageNumber())
                        .pnlPrintingNumber(info.getPnlPrintingNumber())
                        .pnlHorizontalMargin(info.getPnlHorizontalMargin())
                        .pnlVerticalMargin(info.getPnlVerticalMargin())
                        .pnlLineSpacing(info.getPnlLineSpacing())
                        .pnlFontType(info.getPnlFontType())
                        .pnlFontSize(info.getPnlFontSize())
                        .pnlExcluded(info.getPnlExcluded())
                        .pnlLines(info.getPnlLines() == null ? List.of() : info.getPnlLines().stream().map(line ->
                                BookResponseDto.PnlLinePayloadDto.builder()
                                        .id(line.getId())
                                        .lineId(line.getLineId())
                                        .ordering(line.getOrdering())
                                        .value(line.getValue())
                                        .pnlFontType(line.getPnlFontType())
                                        .pnlFontSize(line.getPnlFontSize())
                                        .pnlFontBold(line.getPnlFontBold())
                                        .pnlFontItalic(line.getPnlFontItalic())
                                        .build()
                        ).toList())
                        .build()
        ).toList();
    }

    private String buildDuplicateTitle(String sourceTitle) {
        String normalized = sourceTitle == null ? "" : sourceTitle.trim();
        if (normalized.isEmpty()) {
            normalized = "Untitled";
        }
        return "copy of " + normalized;
    }

    private String resolveCreationAuthorFullName(Book book) {
        if (book.getCreation_author() == null) {
            return null;
        }

        String firstName = normalizeBlankToNull(book.getCreation_author().getFirstName());
        String lastName = normalizeBlankToNull(book.getCreation_author().getLastName());
        String fullName = ((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim();
        if (!fullName.isEmpty()) {
            return fullName;
        }

        String username = normalizeBlankToNull(book.getCreation_author().getUsername());
        if (username != null) {
            return username;
        }

        return normalizeBlankToNull(book.getCreation_author().getEmail());
    }

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

    private boolean shouldApply(boolean partial, Object value) {
        return !partial || value != null;
    }

    private String normalizeBlankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<String> cleanStringList(List<String> values) {
        if (values == null) return List.of();
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }

    private boolean isCoverEmpty(BookRequestDto.CoverPayloadDto coverDto) {
        return normalizeBlankToNull(coverDto.getTitle()) == null
                && normalizeBlankToNull(coverDto.getBarcodeId()) == null
                && cleanStringList(coverDto.getImages()).isEmpty()
                && cleanStringList(coverDto.getTexts()).isEmpty()
                && normalizeBlankToNull(coverDto.getPdfFilePath()) == null
                && normalizeBlankToNull(coverDto.getPdfFileBase64()) == null
                && coverDto.getCoverTemplateId() == null;
    }

    private boolean isContentEmpty(BookRequestDto.ContentPayloadDto contentDto) {
        return normalizeBlankToNull(contentDto.getTextContent()) == null
                && normalizeBlankToNull(contentDto.getFilePath()) == null
                && normalizeBlankToNull(contentDto.getFileBase64()) == null
                && contentDto.getTextTemplateId() == null;
    }

    private String storePdfFile(String rawBase64, String requestedFileName, String prefix) {
        try {
            Files.createDirectories(CUSTOM_BOOK_UPLOADS_DIR);
            String sanitizedFileName = sanitizePdfFileName(requestedFileName, prefix);
            String base64Payload = rawBase64.contains(",") ? rawBase64.substring(rawBase64.indexOf(',') + 1) : rawBase64;
            byte[] bytes = Base64.getDecoder().decode(base64Payload);

            Path target = CUSTOM_BOOK_UPLOADS_DIR.resolve(prefix + "-" + UUID.randomUUID() + "-" + sanitizedFileName);
            Files.write(target, bytes);
            return target.toAbsolutePath().toString();
        } catch (IllegalArgumentException | IOException exception) {
            throw new IllegalStateException("Unable to store PDF file", exception);
        }
    }

    private String sanitizePdfFileName(String requestedFileName, String prefix) {
        String candidate = normalizeBlankToNull(requestedFileName);
        if (candidate == null) {
            return prefix + ".pdf";
        }

        String sanitized = candidate.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!sanitized.toLowerCase().endsWith(".pdf")) {
            sanitized = sanitized + ".pdf";
        }
        return sanitized;
    }

    private <E extends Enum<E>> E parseEnum(Class<E> enumClass, String rawValue, E defaultValue) {
        if (rawValue == null || rawValue.isBlank()) return defaultValue;
        try {
            return Enum.valueOf(enumClass, rawValue.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return defaultValue;
        }
    }
}
