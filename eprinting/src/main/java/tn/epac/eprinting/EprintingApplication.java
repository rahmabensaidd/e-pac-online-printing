package tn.epac.eprinting;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import tn.epac.eprinting.model.entities.Book;
import tn.epac.eprinting.model.enums.*;
import tn.epac.eprinting.repository.BookRepository;

@SpringBootApplication
public class EprintingApplication {

	public static void main(String[] args) {
		SpringApplication.run(EprintingApplication.class, args);
	}

	@Bean
	public CommandLineRunner initData(BookRepository bookRepository) {
		return args -> {
			// Supprimer TOUTES les données existantes
			System.out.println("Deleting all existing books...");
			bookRepository.deleteAll();
			System.out.println("All books deleted. Remaining count: " + bookRepository.count());

			// Créer de nouvelles données avec les bonnes valeurs d'enum
			System.out.println("Initializing sample books...");

			Book book1 = Book.builder()
					.title("Le Petit Prince")
					.description("Un conte poétique et philosophique")
					.authors(new String[]{"Antoine de Saint-Exupéry"})
					.quantity(50)
					.productionPage(96)
					.height(190)
					.thickness(10)
					.width(120)
					.securityLabel(false)
					.hasCoil(false)
					.hasInsert(false)
					.hasTab(false)
					.hasBackcover(true)
					.perf(false)
					.doubleSidedCover(true)
					.shrinkwrap(true)
					.threeHoleDrill(false)
					.textPaperType(TextPaperType.NONE)
					.textColor(TextColor.FOUR_FOUR)
					.coverFinishType(CoverFinishType.MATT)
					.coverColor(CoverColor.FOUR_ZERO)
					.coverSize(CoverSize.XXL)
					.coverPaperType(CoverPaperType.NONE)
					.headAndTail(HeadAndTail.NONE)
					.priorityLevel(PriorityLevel.NORMAL)
					.bindingType(BindingType.CASEBIND_ES)
					.salePrice(12.99f)
					.is_added_from_admin(true)
					.stock_status(AdminBookStatus.IN_STOCK)
					.is_created_by_user(false)
					.build();

			bookRepository.save(book1);

			Book book2 = Book.builder()
					.title("Spring Boot Mastery")
					.description("Guide complet Spring Boot")
					.authors(new String[]{"John Doe"})
					.quantity(30)
					.productionPage(450)
					.height(240)
					.thickness(25)
					.width(170)
					.securityLabel(true)
					.hasCoil(false)
					.hasInsert(true)
					.hasTab(false)
					.hasBackcover(true)
					.perf(false)
					.doubleSidedCover(true)
					.shrinkwrap(true)
					.threeHoleDrill(false)
					.textPaperType(TextPaperType.FSC_MC_CVG_SILKHO_1_0_70)
					.textColor(TextColor.FOUR_FOUR)
					.coverFinishType(CoverFinishType.MATT)
					.coverColor(CoverColor.FOUR_FOUR)
					.coverSize(CoverSize.XL)
					.coverPaperType(CoverPaperType.GLOSS_COVER_80)
					.headAndTail(HeadAndTail.BLACK_AND_WHITE)
					.priorityLevel(PriorityLevel.NORMAL)
					.bindingType(BindingType.CASEBIND)  // Valeur valide de l'enum
					.coilType(CoilType.METAL)
					.tabColor(TabColor.NONE)
					.insertPaperType(InsertPaperType.NONE)
					.caseFinishType(CaseFinishType.LAYFLAT_GLOSS)
					.spineType(SpineType.ROUND)
					.labelType(LabelType.STANDARD)
					.salePrice(49.99f)
					.is_added_from_admin(true)
					.stock_status(AdminBookStatus.IN_STOCK)
					.is_created_by_user(false)
					.build();

			bookRepository.save(book2);

			System.out.println("Sample books created: " + bookRepository.count());
		};
	}
}