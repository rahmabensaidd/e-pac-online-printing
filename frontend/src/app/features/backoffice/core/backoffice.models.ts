export type BackofficeTone = 'positive' | 'neutral' | 'warning' | 'danger';
export type OrderStatus =
  | 'Pending Review'
  | 'Prepress'
  | 'In Production'
  | 'Ready to Ship'
  | 'Delayed'
  | 'Completed';
export type OrderPriority = 'Low' | 'Normal' | 'High' | 'Critical';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';
export type InventoryStatus = 'Healthy' | 'Low stock' | 'Reorder now' | 'Incoming';
export type EmployeeStatus = 'On Shift' | 'Remote' | 'Reviewing' | 'Offline';
export type DigestFrequency = 'Daily' | 'Weekly';
export type AccentMode = 'Warm' | 'Balanced';

export interface BackofficeNavItem {
  label: string;
  route: string;
  icon: string;
  description: string;
  group: 'Operations' | 'Workspace' |'Design';
  exact?: boolean;
  badge?: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  hint: string;
  icon: string;
  tone: BackofficeTone;
}

export interface BackofficeAlert {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  tone: BackofficeTone;
}

export interface BackofficeActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  route: string;
  icon: string;
  tone: BackofficeTone;
}

export interface BackofficeOrder {
  id: string;
  reference: string;
  customerName: string;
  companyName: string;
  channel: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: OrderStatus;
  priority: OrderPriority;
  assignee: string;
  items: number;
  shippingMethod: string;
  paymentStatus: PaymentStatus;
  notes: string;
}

export interface BackofficeOrderDraft {
  reference: string;
  customerName: string;
  companyName: string;
  channel: string;
  submittedAt: string;
  dueDate: string;
  total: number;
  status: OrderStatus;
  priority: OrderPriority;
  assignee: string;
  items: number;
  shippingMethod: string;
  notes: string;
  paymentStatus: PaymentStatus;
}

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  reorderPoint: number;
  coverageDays: number;
  incomingUnits: number;
  leadTimeDays: number;
  location: string;
  status: InventoryStatus;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  role: string;
  state: EmployeeStatus;
  shift: string;
  email: string;
  workloadPercent: number;
  activeOrders: number;
  phone: string;
}

export interface WorkspaceSettings {
  workspaceName: string;
  supportEmail: string;
  timezone: string;
  defaultDueWindowDays: number;
  autoAssignOrders: boolean;
  digestFrequency: DigestFrequency;
  lowStockThreshold: number;
  accentMode: AccentMode;
}

export interface BackofficePageMeta {
  title: string;
  description: string;
}
