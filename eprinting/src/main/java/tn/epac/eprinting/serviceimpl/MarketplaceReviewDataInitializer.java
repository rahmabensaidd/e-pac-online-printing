package tn.epac.eprinting.serviceimpl;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.entities.BookReview;
import tn.epac.eprinting.repository.BookRepository;
import tn.epac.eprinting.repository.BookReviewRepository;

import java.util.List;

@Component
@RequiredArgsConstructor
public class MarketplaceReviewDataInitializer implements CommandLineRunner {

    private final BookRepository bookRepository;
    private final BookReviewRepository bookReviewRepository;

    @Override
    public void run(String... args) {
        if (bookReviewRepository.count() > 0) {
            return;
        }

        List<Book> marketplaceBooks = bookRepository.findMarketplaceBooks(null, org.springframework.data.domain.PageRequest.of(0, 6)).getContent();
        if (marketplaceBooks.isEmpty()) {
            return;
        }

        String[][] reviewSeeds = new String[][]{
                {"Nour A.", "Marketing", "5", "The print finish was clean, colors were accurate, and the book arrived ready for campaign launch.", "true"},
                {"Amine S.", "Founder", "5", "Configuration was straightforward and the final hardcover felt premium from cover to binding.", "true"},
                {"Sarra M.", "Photographer", "5", "Image-heavy pages printed beautifully and the binding stayed solid after repeated handling.", "true"},
                {"Youssef B.", "Operations", "4", "Strong production quality and reliable packaging. We only adjusted one spec before the final run.", "false"},
                {"Meriem K.", "Creative Lead", "5", "The marketplace listing matched the delivered result closely, which made approval much easier.", "false"},
                {"Hedi J.", "Studio Manager", "4", "Good communication, consistent paper quality, and a professional feel for client-ready books.", "false"}
        };

        for (int index = 0; index < marketplaceBooks.size(); index++) {
            Book book = marketplaceBooks.get(index);
            String[] seed = reviewSeeds[index % reviewSeeds.length];
            bookReviewRepository.save(BookReview.builder()
                    .book(book)
                    .reviewerName(seed[0])
                    .reviewerRole(seed[1])
                    .rating(Integer.parseInt(seed[2]))
                    .comment(seed[3])
                    .featured(Boolean.parseBoolean(seed[4]))
                    .build());
        }
    }
}
