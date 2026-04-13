package tn.epac.eprinting.model.enums;

public enum OrderStatus {
    PRINTING,
    READY_TO_SHIP,
    SHIPPED,
    // Legacy statuses retained for backward compatibility
    PENDING,
    PROCESSING,
    DELIVERED,
    CANCELLED,
    REJECTED
}
