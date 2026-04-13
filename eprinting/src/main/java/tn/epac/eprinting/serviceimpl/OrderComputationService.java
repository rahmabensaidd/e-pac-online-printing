package tn.epac.eprinting.serviceimpl;

import org.springframework.stereotype.Service;
import tn.epac.eprinting.model.entities.OrderLine;
import tn.epac.eprinting.model.enums.CartItemSource;
import tn.epac.eprinting.model.enums.OrderLineStatus;
import tn.epac.eprinting.model.enums.OrderPriority;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.model.enums.OrderValidationStatus;
import tn.epac.eprinting.model.enums.PriorityLevel;

import java.util.List;

@Service
public class OrderComputationService {

    public void initializeLineDefaults(OrderLine line) {
        if (line == null) {
            return;
        }

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
            line.setPriority(resolvePriorityFromBook(line));
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

        boolean anyPrinting = customLines.stream().anyMatch(line -> line.getLineStatus() == OrderLineStatus.PRINTING);
        if (anyPrinting) {
            return OrderStatus.PRINTING;
        }

        boolean allShipped = customLines.stream().allMatch(line -> line.getLineStatus() == OrderLineStatus.SHIPPED);
        if (allShipped) {
            return OrderStatus.SHIPPED;
        }

        boolean allReadyToShip = customLines.stream().allMatch(line -> line.getLineStatus() == OrderLineStatus.READY_TO_SHIP);
        if (allReadyToShip) {
            return OrderStatus.READY_TO_SHIP;
        }

        // If there is no PRINTING line, the order can be prepared for shipment
        // even when some custom lines are already SHIPPED and others READY_TO_SHIP.
        boolean anyReadyToShip = customLines.stream().anyMatch(line -> line.getLineStatus() == OrderLineStatus.READY_TO_SHIP);
        if (anyReadyToShip) {
            return OrderStatus.READY_TO_SHIP;
        }

        return OrderStatus.PRINTING;
    }

    public OrderPriority computeOrderPriority(List<OrderLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return OrderPriority.NORMAL;
        }

        OrderPriority best = OrderPriority.NORMAL;
        for (OrderLine line : lines) {
            OrderPriority linePriority = normalizePriority(line != null ? line.getPriority() : null);
            if (linePriority.rank() > best.rank()) {
                best = linePriority;
            }
        }

        return best;
    }

    public OrderValidationStatus computeOrderValidationStatus(List<OrderLine> lines) {
        List<OrderLine> customLines = lines == null
                ? List.of()
                : lines.stream().filter(OrderLine::isCustomItem).toList();

        if (customLines.isEmpty()) {
            return OrderValidationStatus.VALIDATED;
        }

        boolean anyRejected = customLines.stream().anyMatch(line -> line.getValidationStatus() == OrderValidationStatus.REJECTED);
        if (anyRejected) {
            return OrderValidationStatus.REJECTED;
        }

        boolean anyPending = customLines.stream().anyMatch(line -> line.getValidationStatus() == null || line.getValidationStatus() == OrderValidationStatus.PENDING);
        if (anyPending) {
            return OrderValidationStatus.PENDING;
        }

        return OrderValidationStatus.VALIDATED;
    }

    public OrderPriority resolvePriorityFromBook(OrderLine line) {
        if (line == null || line.getBook() == null || line.isMarketplaceItem()) {
            return OrderPriority.NORMAL;
        }

        PriorityLevel level = line.getBook().getPriorityLevel();
        if (level == null) {
            return OrderPriority.HIGH1;
        }

        return switch (level) {
            case HIGH3 -> OrderPriority.HIGH3;
            case HIGH2 -> OrderPriority.HIGH2;
            case HIGH1 -> OrderPriority.HIGH1;
            case NORMAL -> OrderPriority.HIGH1;
        };
    }

    public OrderPriority normalizePriority(OrderPriority value) {
        if (value == null) {
            return OrderPriority.NORMAL;
        }
        return switch (value) {
            case LOW -> OrderPriority.NORMAL;
            case MEDIUM -> OrderPriority.HIGH1;
            case HIGH -> OrderPriority.HIGH3;
            default -> value;
        };
    }
}
