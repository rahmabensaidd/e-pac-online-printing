import { BackofficeDataTableRow } from '../shared/backoffice-data-table.models';

export type OrderStatusUi = 'Printing' | 'Ready to ship' | 'Shipped' | 'Rejected' | 'Cancelled';
export type OrderFilter = 'All' | OrderStatusUi;
export type OrderPriorityUi = 'Normal' | 'High1' | 'High2' | 'High3';
export type PaymentStatusUi = 'Paid' | 'Pending' | 'Failed';
export type OrderValidationStatusUi = 'Pending' | 'Validated' | 'Rejected';

export type OrderFormField =
  | 'reference'
  | 'customerName'
  | 'companyName'
  | 'channel'
  | 'submittedAt'
  | 'dueDate'
  | 'total'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'items'
  | 'shippingMethod'
  | 'paymentStatus';

export interface OrderViewModel {
  id: string;
  reference: string;
  customerName: string;
  companyName: string;
  channel: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: OrderStatusUi;
  validationStatus: OrderValidationStatusUi;
  priority: OrderPriorityUi;
  assignee: string;
  items: number;
  shippingMethod: string;
  paymentStatus: PaymentStatusUi;
  notes: string;
  orderLines: OrderLineViewModel[];
}

export interface OrderTableRow extends BackofficeDataTableRow {
  reference: string;
  customerName: string;
  companyName: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: OrderStatusUi;
  validationStatus: OrderValidationStatusUi;
  priority: OrderPriorityUi;
  assignee: string;
  items: number;
  paymentStatus: PaymentStatusUi;
}

export interface OrderLineViewModel {
  orderLineId: string;
  title: string;
  itemSource: 'Marketplace' | 'Custom';
  lineStatus: string;
  validationStatus: OrderValidationStatusUi;
  priority: string;
  quantity: number;
  totalPrice: number;
}
