import {Component, computed, input, output, signal} from '@angular/core';
import {
  BackofficeDataTableAction,
  BackofficeDataTableColumn, BackofficeDataTableColumnType, BackofficeDataTableEmptyState,
  BackofficeDataTableRow, BackofficeDataTableRowActionEvent
} from "../shared/backoffice-data-table.models";
import {BackofficeEmptyStateComponent} from "../shared/backoffice-empty-state";
type SortDirection = 'asc' | 'desc';
@Component({
  selector: 'app-bookstable',
  imports: [
    BackofficeEmptyStateComponent
  ],
  templateUrl: './bookstable.html',
  styleUrl: './bookstable.css',
  standalone: true
})
export class Bookstable { private readonly currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  readonly title = input('');
  readonly description = input('');
  readonly rows = input.required<readonly BackofficeDataTableRow[]>();
  readonly columns = input.required<readonly BackofficeDataTableColumn[]>();
  readonly rowActions = input<readonly BackofficeDataTableAction[]>([]);
  readonly searchPlaceholder = input('Search');
  readonly searchKeys = input<readonly string[]>([]);
  readonly loading = input(false);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 20]);
  readonly emptyState = input<BackofficeDataTableEmptyState>({
    icon: 'fa-table',
    title: 'No rows found',
    description: 'Adjust your filters or add new records to populate this table.',
    actionLabel: '',
  });

  readonly rowAction = output<BackofficeDataTableRowActionEvent>();
  readonly emptyAction = output<void>();

  readonly searchQuery = signal('');
  readonly sortKey = signal<string | null>(null);
  readonly sortDirection = signal<SortDirection>('asc');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly activeSortKey = computed(() => {
    const current = this.sortKey();
    if (current) {
      return current;
    }

    return this.columns().find((column) => column.sortable)?.key ?? null;
  });

  readonly resolvedPageSize = computed(() => {
    const options = this.pageSizeOptions();
    return options.includes(this.pageSize()) ? this.pageSize() : (options[0] ?? 10);
  });

  readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const rows = this.rows();

    if (!query) {
      return rows;
    }

    const searchKeys = this.resolveSearchKeys();

    return rows.filter((row) =>
        searchKeys.some((key) => this.stringifyValue(row[key]).toLowerCase().includes(query)),
    );
  });

  readonly sortedRows = computed(() => {
    const sortKey = this.activeSortKey();

    if (!sortKey) {
      return this.filteredRows();
    }

    const column = this.columns().find((candidate) => candidate.key === sortKey);

    if (!column) {
      return this.filteredRows();
    }

    const multiplier = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.filteredRows()].sort((left, right) => {
      const leftValue = this.normalizeSortValue(left[sortKey], column.type ?? 'text');
      const rightValue = this.normalizeSortValue(right[sortKey], column.type ?? 'text');

      if (leftValue < rightValue) {
        return -1 * multiplier;
      }

      if (leftValue > rightValue) {
        return 1 * multiplier;
      }

      return 0;
    });
  });

  readonly totalResults = computed(() => this.sortedRows().length);
  readonly pageCount = computed(() =>
      Math.max(1, Math.ceil(this.totalResults() / this.resolvedPageSize())),
  );
  readonly safeCurrentPage = computed(() => Math.min(this.currentPage(), this.pageCount()));
  readonly paginatedRows = computed(() => {
    const start = (this.safeCurrentPage() - 1) * this.resolvedPageSize();
    return this.sortedRows().slice(start, start + this.resolvedPageSize());
  });
  readonly visibleRangeStart = computed(() =>
      this.totalResults() === 0 ? 0 : (this.safeCurrentPage() - 1) * this.resolvedPageSize() + 1,
  );
  readonly visibleRangeEnd = computed(() =>
      Math.min(this.safeCurrentPage() * this.resolvedPageSize(), this.totalResults()),
  );

  setSearchQuery(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchQuery.set(target?.value ?? '');
    this.currentPage.set(1);
  }

  sortBy(column: BackofficeDataTableColumn): void {
    if (!column.sortable) {
      return;
    }

    if (this.activeSortKey() === column.key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortKey.set(column.key);
    this.sortDirection.set('asc');
  }

  setPageSize(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const parsed = Number(target?.value);
    const nextSize = Number.isFinite(parsed) ? parsed : this.resolvedPageSize();
    this.pageSize.set(nextSize);
    this.currentPage.set(1);
  }

  previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(this.pageCount(), page + 1));
  }

  emitRowAction(actionId: string, rowId: string): void {
    this.rowAction.emit({ actionId, rowId });
  }

  formatCellValue(column: BackofficeDataTableColumn, row: BackofficeDataTableRow): string {
    const value = row[column.key];
    const type = column.type ?? 'text';

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (type === 'currency') {
      return this.currencyFormatter.format(Number(value));
    }

    if (type === 'date') {
      const dateValue = new Date(String(value));
      return Number.isNaN(dateValue.getTime())
          ? String(value)
          : this.dateFormatter.format(dateValue);
    }

    return this.stringifyValue(value);
  }

  secondaryValue(column: BackofficeDataTableColumn, row: BackofficeDataTableRow): string {
    return column.secondaryKey ? this.stringifyValue(row[column.secondaryKey]) : '';
  }

  ariaSort(column: BackofficeDataTableColumn): 'ascending' | 'descending' | 'none' {
    if (!column.sortable || this.activeSortKey() !== column.key) {
      return 'none';
    }

    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  isSortedBy(column: BackofficeDataTableColumn): boolean {
    return this.activeSortKey() === column.key;
  }

  alignClass(column: BackofficeDataTableColumn): string {
    if (column.align === 'right') {
      return 'text-right';
    }

    if (column.align === 'center') {
      return 'text-center';
    }

    return 'text-left';
  }

  badgeClass(
      type: BackofficeDataTableColumnType,
      row: BackofficeDataTableRow,
      column: BackofficeDataTableColumn,
  ): string {
    const value = String(row[column.key] ?? '').toLowerCase();

    if (type === 'priority') {
      if (value.includes('critical')) {
        return 'bg-brand-pink/12 text-brand-pink border-brand-pink/20';
      }

      if (value.includes('high')) {
        return 'bg-brand-orange/12 text-brand-orange border-brand-orange/20';
      }

      if (value.includes('low')) {
        return 'bg-slate-100 text-slate-500 border-slate-200';
      }

      return 'bg-brand-cream text-brand-navy border-slate-200';
    }

    if (value.includes('delayed') || value.includes('reorder')) {
      return 'bg-brand-pink/12 text-brand-pink border-brand-pink/20';
    }

    if (
        value.includes('ready') ||
        value.includes('healthy') ||
        value.includes('completed') ||
        value.includes('paid')
    ) {
      return 'bg-brand-teal/12 text-brand-navy border-brand-teal/20';
    }

    if (
        value.includes('production') ||
        value.includes('prepress') ||
        value.includes('incoming') ||
        value.includes('partial')
    ) {
      return 'bg-brand-orange/12 text-brand-orange border-brand-orange/20';
    }

    return 'bg-brand-cream text-brand-navy border-slate-200';
  }

  actionClass(tone: 'default' | 'danger' = 'default'): string {
    return tone === 'danger'
        ? 'admin-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-pink/20 bg-brand-pink/8 text-brand-pink transition duration-200 hover:bg-brand-pink/15'
        : 'admin-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-navy transition duration-200 hover:border-slate-300 hover:bg-slate-50';
  }

  trackByRowId(_: number, row: BackofficeDataTableRow): string {
    return row.id;
  }

  private resolveSearchKeys(): string[] {
    const explicitSearchKeys = this.searchKeys();

    if (explicitSearchKeys.length > 0) {
      return [...explicitSearchKeys];
    }

    return this.columns().flatMap((column) =>
        column.secondaryKey ? [column.key, column.secondaryKey] : [column.key],
    );
  }

  private normalizeSortValue(
      value: BackofficeDataTableRow[string],
      type: BackofficeDataTableColumnType,
  ): number | string {
    if (type === 'currency' || type === 'numeric') {
      return Number(value ?? 0);
    }

    if (type === 'date') {
      return new Date(String(value ?? '')).getTime() || 0;
    }

    return this.stringifyValue(value).toLowerCase();
  }

  private stringifyValue(value: BackofficeDataTableRow[string]): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }
}
