export type BackofficeDataTableCellValue = string | number | boolean | null | undefined;
export type BackofficeDataTableColumnType =
  | 'text'
  | 'status'
  | 'priority'
  | 'currency'
  | 'date'
  | 'numeric';

export interface BackofficeDataTableRow {
  id: string;
  [key: string]: BackofficeDataTableCellValue;
}

export interface BackofficeDataTableColumn {
  key: string;
  label: string;
  type?: BackofficeDataTableColumnType;
  secondaryKey?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  monospace?: boolean;
}

export interface BackofficeDataTableAction {
  id: string;
  label: string;
  icon: string;
  tone?: 'default' | 'danger';
}

export interface BackofficeDataTableEmptyState {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface BackofficeDataTableRowActionEvent {
  actionId: string;
  rowId: string;
}
