import { AdminOrderApiModel, AdminOrderUpsertRequest } from '../core/backoffice-orders-api.service';
import { OrderPriorityUi, OrderStatusUi, OrderValidationStatusUi, OrderViewModel, PaymentStatusUi } from './orders.models';

export interface OrderFormRawValue {
  reference: string;
  customerName: string;
  companyName: string;
  channel: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: OrderStatusUi;
  priority: OrderPriorityUi;
  assignee: string;
  items: number;
  shippingMethod: string;
  paymentStatus: PaymentStatusUi;
  notes: string;
}

export function mapApiOrderToViewModel(order: AdminOrderApiModel): OrderViewModel {
  return {
    id: String(order.orderId),
    reference: order.reference,
    customerName: order.customerName,
    companyName: order.companyName ?? '',
    channel: order.channel,
    submittedAt: order.submittedAt,
    dueDate: order.dueDate,
    total: order.total,
    status: mapApiStatusToUi(order.status),
    validationStatus: mapApiValidationStatusToUi(order.validationStatus),
    priority: mapApiPriorityToUi(order.priority),
    assignee: order.assignee ?? '',
    items: order.items || 0,
    shippingMethod: order.shippingMethod || 'Standard',
    paymentStatus: mapApiPaymentStatusToUi(order.paymentStatus),
    notes: order.notes ?? '',
    orderLines: (order.orderLines ?? []).map((line) => ({
      orderLineId: String(line.orderLineId),
      title: line.title || 'Untitled',
      itemSource: (line.itemSource || '').toUpperCase() === 'CUSTOM' ? 'Custom' : 'Marketplace',
      lineStatus: line.lineStatus || ((line.itemSource || '').toUpperCase() === 'CUSTOM' ? 'PRINTING' : 'READY'),
      validationStatus: mapApiValidationStatusToUi(line.validationStatus),
      priority: line.priority || 'NORMAL',
      quantity: line.quantity || 0,
      totalPrice: line.totalPrice || 0,
    })),
  };
}

export function buildUpsertPayload(
  draft: OrderFormRawValue,
  includeReference: boolean,
): AdminOrderUpsertRequest {
  return {
    reference: includeReference ? draft.reference : undefined,
    customerName: draft.customerName,
    companyName: draft.companyName?.trim() ? draft.companyName : undefined,
    channel: draft.channel,
    submittedAt: draft.submittedAt,
    dueDate: draft.dueDate,
    total: draft.total,
    status: mapUiStatusToApi(draft.status),
    priority: mapUiPriorityToApi(draft.priority),
    assignee: draft.assignee,
    items: draft.items,
    shippingMethod: draft.shippingMethod,
    paymentStatus: mapUiPaymentStatusToApi(draft.paymentStatus),
    notes: draft.notes?.trim() ? draft.notes : undefined,
  };
}

export function mapApiStatusToUi(status: string): OrderStatusUi {
  switch ((status || '').toUpperCase()) {
    case 'PRINTING':
      return 'Printing';
    case 'READY_TO_SHIP':
      return 'Ready to ship';
    case 'SHIPPED':
      return 'Shipped';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
    default:
      return 'Cancelled';
  }
}

export function mapUiStatusToApi(status: OrderStatusUi): string {
  switch (status) {
    case 'Printing':
      return 'PRINTING';
    case 'Ready to ship':
      return 'READY_TO_SHIP';
    case 'Shipped':
      return 'SHIPPED';
    case 'Rejected':
      return 'REJECTED';
    case 'Cancelled':
    default:
      return 'CANCELLED';
  }
}

export function mapApiPriorityToUi(priority: string): OrderPriorityUi {
  switch ((priority || '').toUpperCase()) {
    case 'HIGH3':
    case 'HIGH':
      return 'High3';
    case 'HIGH2':
      return 'High2';
    case 'HIGH1':
    case 'MEDIUM':
      return 'High1';
    case 'LOW':
    default:
      return 'Normal';
  }
}

export function mapUiPriorityToApi(priority: OrderPriorityUi): string {
  switch (priority) {
    case 'High3':
      return 'HIGH3';
    case 'High2':
      return 'HIGH2';
    case 'High1':
      return 'HIGH1';
    case 'Normal':
    default:
      return 'NORMAL';
  }
}

export function mapApiValidationStatusToUi(status?: string | null): OrderValidationStatusUi {
  switch ((status || '').toUpperCase()) {
    case 'VALIDATED':
      return 'Validated';
    case 'REJECTED':
      return 'Rejected';
    case 'PENDING':
    default:
      return 'Pending';
  }
}

export function mapApiPaymentStatusToUi(status: string): PaymentStatusUi {
  switch ((status || '').toUpperCase()) {
    case 'PAID':
      return 'Paid';
    case 'FAILED':
      return 'Failed';
    case 'PENDING':
    default:
      return 'Pending';
  }
}

export function mapUiPaymentStatusToApi(status: PaymentStatusUi): string {
  switch (status) {
    case 'Paid':
      return 'PAID';
    case 'Failed':
      return 'FAILED';
    case 'Pending':
    default:
      return 'PENDING';
  }
}
