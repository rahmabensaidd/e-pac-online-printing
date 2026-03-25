package tn.epac.eprinting;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.enums.AdminBookStatus;
import tn.epac.eprinting.repository.BookRepository;

@SpringBootApplication
public class EprintingApplication {

	public static void main(String[] args) {
		SpringApplication.run(EprintingApplication.class, args);
	}

	@Bean
	public CommandLineRunner initData(BookRepository bookRepository) {
		return args -> {
			// Vérifier si la table est vide
			if (bookRepository.count() == 0) {
				System.out.println("Initializing sample books...");

				// Livre 1
				Book book1 = new Book();
				book1.setTitle("Le Petit Prince");
				book1.setDescription("Un conte poétique et philosophique");
				book1.setAuthors(new String[]{"Antoine de Saint-Exupéry"});
				book1.setQuantity(50);
				book1.setPageCount(96);
				book1.setHeight(190);
				book1.setThickness(10);
				book1.setWidth(120);
				book1.setSecurityLabel(false);
				book1.setHasCoil(false);
				book1.setHasInsert(false);
				book1.setHasTab(false);
				book1.setHasBackcover(true);
				book1.setPerf(false);
				book1.setDoubleSidedCover(true);
				book1.setShrinkwrap(true);
				book1.setThreeHoleDrill(false);
				book1.setTextPaperType("Standard");
				book1.setTextColor("Black");
				book1.setCoverFinishType("Matte");
				book1.setCoverColor("Yellow");
				book1.setCoverSize("A5");
				book1.setCoverPaperType("Cardboard");
				book1.setHeadAndTail("None");
				book1.setPriorityLevel("Normal");
				book1.setBindingType("Perfect Binding");
				book1.setSiren("123456789");
				book1.setSalePrice(12.99f);
				book1.set_added_from_admin(true);
				book1.setStock_status(AdminBookStatus.IN_STOCK);
				book1.set_created_by_user(false);
				bookRepository.save(book1);

				// Livre 2
				Book book2 = new Book();
				book2.setTitle("Spring Boot Mastery");
				book2.setDescription("Guide complet Spring Boot");
				book2.setAuthors(new String[]{"John Doe"});
				book2.setQuantity(30);
				book2.setPageCount(450);
				book2.setHeight(240);
				book2.setThickness(25);
				book2.setWidth(170);
				book2.setSecurityLabel(true);
				book2.setHasCoil(false);
				book2.setHasInsert(true);
				book2.setHasTab(false);
				book2.setHasBackcover(true);
				book2.setPerf(false);
				book2.setDoubleSidedCover(true);
				book2.setShrinkwrap(true);
				book2.setThreeHoleDrill(false);
				book2.setTextPaperType("Premium");
				book2.setTextColor("Black");
				book2.setCoverFinishType("Glossy");
				book2.setCoverColor("Blue");
				book2.setCoverSize("A4");
				book2.setCoverPaperType("Hardcover");
				book2.setHeadAndTail("Ribbon");
				book2.setPriorityLevel("High");
				book2.setBindingType("Spiral");
				book2.setCoilType("Metal");
				book2.setSiren("123456789");
				book2.setSalePrice(49.99f);
				book2.set_added_from_admin(true);
				book2.setStock_status(AdminBookStatus.IN_STOCK);
				book2.set_added_from_admin(false);
				bookRepository.save(book2);

				System.out.println("Sample books created: " + bookRepository.count());
			} else {
				System.out.println("Database already has " + bookRepository.count() + " books");
			}
		};
	}
}