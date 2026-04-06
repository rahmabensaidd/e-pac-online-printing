import { AdminOrderApiModel, AdminOrderUpsertRequest } from '../core/backoffice-orders-api.service';
import { OrderPriorityUi, OrderStatusUi, OrderViewModel, PaymentStatusUi } from './orders.models';

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
    priority: mapApiPriorityToUi(order.priority),
    assignee: order.assignee ?? '',
    items: order.items || 0,
    shippingMethod: order.shippingMethod || 'Standard',
    paymentStatus: mapApiPaymentStatusToUi(order.paymentStatus),
    notes: order.notes ?? '',
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
    case 'PENDING':
      return 'Pending';
    case 'PROCESSING':
      return 'Processing';
    case 'SHIPPED':
      return 'Shipped';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
    default:
      return 'Cancelled';
  }
}

export function mapUiStatusToApi(status: OrderStatusUi): string {
  switch (status) {
    case 'Pending':
      return 'PENDING';
    case 'Processing':
      return 'PROCESSING';
    case 'Shipped':
      return 'SHIPPED';
    case 'Delivered':
      return 'DELIVERED';
    case 'Cancelled':
    default:
      return 'CANCELLED';
  }
}

export function mapApiPriorityToUi(priority: string): OrderPriorityUi {
  switch ((priority || '').toUpperCase()) {
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
    default:
      return 'Low';
  }
}

export function mapUiPriorityToApi(priority: OrderPriorityUi): string {
  switch (priority) {
    case 'High':
      return 'HIGH';
    case 'Medium':
      return 'MEDIUM';
    case 'Low':
    default:
      return 'LOW';
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

