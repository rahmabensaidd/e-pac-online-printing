package tn.epac.eprinting.serviceimpl;

import org.springframework.stereotype.Service;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.model.enums.CartItemSource;
import tn.epac.eprinting.model.enums.OrderLineStatus;
import tn.epac.eprinting.model.enums.OrderPriority;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.OrderValidationStatus;

import java.util.List;

@Service
public class OrderComputationService {

    public void initializeLineDefaults(OrderLine line) {
        if (line == null) return;

        if (line.getItemSource() == null) {
            line.setItemSource(CartItemSource.MARKETPLACE);
        }

        if (line.isMarketplaceItem()) {
            line.setLineStatus(OrderLineStatus.READY);
            line.setPriority(OrderPriority.NORMAL);
            line.setValidationStatus(OrderValidationStatus.VALIDATED);
            return;
        }

        if (line.getLineStatus() == null) {
            line.setLineStatus(OrderLineStatus.PRINTING);
        }
        if (line.getPriority() == null) {
            line.setPriority(OrderPriority.NORMAL);
        }
        if (line.getValidationStatus() == null) {
            line.setValidationStatus(OrderValidationStatus.PENDING);
        }
    }

    public OrderStatus computeGlobalStatusFromLines(List<OrderLine> lines) {
        List<OrderLine> customLines = lines == null
                ? List.of()
                : lines.stream().filter(OrderLine::isCustomItem).toList();

        if (customLines.isEmpty()) {
            return OrderStatus.READY_TO_SHIP;
        }

        boolean anyRejected = customLines.stream()
                .anyMatch(line -> line.getLineStatus() == OrderLineStatus.REJECTED);
        if (anyRejected) {
            return OrderStatus.REJECTED;
        }

        boolean anyPrinting = customLines.stream()
                .anyMatch(line -> line.getLineStatus() == OrderLineStatus.PRINTING);
        if (anyPrinting) {
            return OrderStatus.IN_PRODUCTION;
        }

        boolean allShipped = customLines.stream()
                .allMatch(line -> line.getLineStatus() == OrderLineStatus.SHIPPED);
        if (allShipped) {
            return OrderStatus.SHIPPED;
        }

        boolean allReadyToShip = customLines.stream()
                .allMatch(line -> line.getLineStatus() == OrderLineStatus.READY_TO_SHIP);
        if (allReadyToShip) {
            return OrderStatus.READY_TO_SHIP;
        }

        boolean anyReadyToShip = customLines.stream()
                .anyMatch(line -> line.getLineStatus() == OrderLineStatus.READY_TO_SHIP);
        if (anyReadyToShip) {
            return OrderStatus.READY_TO_SHIP;
        }

        return OrderStatus.IN_PRODUCTION;
    }

    public OrderPriority computeOrderPriority(List<OrderLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return OrderPriority.NORMAL;
        }

        OrderPriority best = OrderPriority.NORMAL;
        for (OrderLine line : lines) {
            OrderPriority linePriority = line != null ? line.getPriority() : OrderPriority.NORMAL;
            if (comparePriority(linePriority, best) > 0) {
                best = linePriority;
            }
        }
        return best;
    }

    private int comparePriority(OrderPriority a, OrderPriority b) {
        return getRank(a) - getRank(b);
    }

    private int getRank(OrderPriority p) {
        if (p == null) return 0;
        return switch (p) {
            case NORMAL -> 0;
            case HIGH1 -> 1;
            case HIGH2 -> 2;
            case HIGH3 -> 3;
        };
    }

    public OrderValidationStatus computeOrderValidationStatus(List<OrderLine> lines) {
        List<OrderLine> customLines = lines == null
                ? List.of()
                : lines.stream().filter(OrderLine::isCustomItem).toList();

        if (customLines.isEmpty()) {
            return OrderValidationStatus.VALIDATED;
        }

        boolean anyRejected = customLines.stream()
                .anyMatch(line -> line.getValidationStatus() == OrderValidationStatus.REJECTED);
        if (anyRejected) {
            return OrderValidationStatus.REJECTED;
        }

        boolean anyPending = customLines.stream()
                .anyMatch(line -> line.getValidationStatus() == null || line.getValidationStatus() == OrderValidationStatus.PENDING);
        if (anyPending) {
            return OrderValidationStatus.PENDING;
        }

        return OrderValidationStatus.VALIDATED;
    }

    /**
     * Normalise une priorité à partir d'une String (pour les valeurs legacy)
     */
    public OrderPriority normalizePriorityFromString(String legacyValue) {
        if (legacyValue == null) {
            return OrderPriority.NORMAL;
        }
        return switch (legacyValue.toUpperCase()) {
            case "LOW" -> OrderPriority.NORMAL;
            case "MEDIUM" -> OrderPriority.HIGH1;
            case "HIGH" -> OrderPriority.HIGH3;
            default -> OrderPriority.NORMAL;
        };
    }

    /**
     * Normalise une priorité (si c'est une valeur legacy, on convertit)
     */
    public OrderPriority normalizePriority(OrderPriority priority) {
        if (priority == null) {
            return OrderPriority.NORMAL;
        }
        // Si priority est déjà NORMAL/HIGH1/HIGH2/HIGH3, on le retourne tel quel
        // Les valeurs legacy LOW/MEDIUM/HIGH n'existent pas dans l'enum actuel
        return priority;
    }

    // Pour l'affichage : mappe NORMAL/HIGH1/HIGH2/HIGH3 -> LOW/MEDIUM/HIGH
    public String getDisplayPriority(OrderPriority priority) {
        if (priority == null) return "LOW";
        return switch (priority) {
            case NORMAL -> "LOW";
            case HIGH1 -> "MEDIUM";
            case HIGH2, HIGH3 -> "HIGH";
        };
    }

    // Pour l'enregistrement : mappe LOW/MEDIUM/HIGH -> NORMAL/HIGH1/HIGH3
    public OrderPriority fromDisplayPriority(String displayPriority) {
        if (displayPriority == null) return OrderPriority.NORMAL;
        return switch (displayPriority.toUpperCase()) {
            case "LOW" -> OrderPriority.NORMAL;
            case "MEDIUM" -> OrderPriority.HIGH1;
            case "HIGH" -> OrderPriority.HIGH3;
            default -> OrderPriority.NORMAL;
        };
    }
}