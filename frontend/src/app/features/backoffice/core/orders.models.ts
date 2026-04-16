// orders.models.ts
export type OrderFilter = 'All' | 'Printing' | 'Ready to ship' | 'Shipped' | 'Rejected' | 'Cancelled';
export type OrderStatusUi = 'Shipped' | 'Rejected' | 'Cancelled';
export type OrderLineStatusUi = 'READY' | 'REJECTED' | 'PRINTING' | 'READY_TO_SHIP';
export type OrderLinePriorityDisplay = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OrderLineViewModel {
    orderLineId: string;
    bookId: number;
    title: string;
    itemSource: 'MARKETPLACE' | 'CUSTOM';
    lineStatus: OrderLineStatusUi;
    priority: OrderLinePriorityDisplay;
    validationStatus: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isEstimated: boolean;
    currency: string;
}

export interface OrderViewModel {
    id: string;
    reference: string;
    customerName: string;
    companyName: string;
    channel: string;
    submittedAt: string;
    dueDate: string;
    total: number;
    status: OrderFilter;
    validationStatus: string;
    priority: OrderLinePriorityDisplay;
    assignee: string;
    items: number;
    paymentStatus: string;
    shippingMethod: string;
    orderLines: OrderLineViewModel[];
}

export interface OrderTableRow {
    id: string;
    reference: string;
    customerName: string;
    companyName: string;
    submittedAt: string;
    dueDate: string;
    total: number;
    status: OrderFilter;
    validationStatus: string;
    priority: OrderLinePriorityDisplay;
    assignee: string;
    items: number;
    paymentStatus: string;
}