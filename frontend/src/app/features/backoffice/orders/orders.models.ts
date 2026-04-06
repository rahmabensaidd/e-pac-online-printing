import { BackofficeDataTableRow } from '../shared/backoffice-data-table.models';

export type OrderStatusUi = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type OrderFilter = 'All' | OrderStatusUi;
export type OrderPriorityUi = 'Low' | 'Medium' | 'High';
export type PaymentStatusUi = 'Paid' | 'Pending' | 'Failed';

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
  priority: OrderPriorityUi;
  assignee: string;
  items: number;
  shippingMethod: string;
  paymentStatus: PaymentStatusUi;
  notes: string;
}

export interface OrderTableRow extends BackofficeDataTableRow {
  reference: string;
  customerName: string;
  companyName: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: OrderStatusUi;
  priority: OrderPriorityUi;
  assignee: string;
  items: number;
  paymentStatus: PaymentStatusUi;
}

