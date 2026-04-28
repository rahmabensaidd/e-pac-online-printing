// orders.mappers.ts
import { AdminOrderApiModel, AdminOrderLineApiModel } from '../core/backoffice-orders-api.service';
import { OrderFilter, OrderLinePriorityDisplay, OrderLineStatusUi, OrderLineViewModel, OrderViewModel } from '../core/orders.models';

export function mapApiOrderToViewModel(apiOrder: AdminOrderApiModel): OrderViewModel {
  const rawOrder = apiOrder as unknown as Record<string, unknown>;
  const rawLines = resolveRawOrderLines(rawOrder);

  return {
    id: String(rawOrder['orderId'] ?? apiOrder.orderId ?? ''),
    reference: String(rawOrder['reference'] ?? apiOrder.reference ?? ''),
    customerName: String(rawOrder['customerName'] ?? rawOrder['customer_name'] ?? apiOrder.customerName ?? ''),
    companyName: String(rawOrder['companyName'] ?? rawOrder['company_name'] ?? apiOrder.companyName ?? ''),
    channel: String(rawOrder['channel'] ?? apiOrder.channel ?? ''),
    submittedAt: String(rawOrder['submittedAt'] ?? rawOrder['submitted_at'] ?? apiOrder.submittedAt ?? ''),
    dueDate: String(rawOrder['dueDate'] ?? rawOrder['due_date'] ?? apiOrder.dueDate ?? ''),
    total: Number(rawOrder['total'] ?? apiOrder.total ?? 0),
    status: mapApiStatusToFilter(String(rawOrder['status'] ?? apiOrder.status ?? '')),
    validationStatus: String(rawOrder['validationStatus'] ?? rawOrder['validation_status'] ?? apiOrder.validationStatus ?? 'PENDING'),
    priority: mapApiPriorityToDisplay(String(rawOrder['priority'] ?? apiOrder.priority ?? 'NORMAL')),
    assignee: String(rawOrder['assignee'] ?? apiOrder.assignee ?? ''),
    items: Number(rawOrder['items'] ?? apiOrder.items ?? rawLines.length),
    paymentStatus: String(rawOrder['paymentStatus'] ?? rawOrder['payment_status'] ?? apiOrder.paymentStatus ?? ''),
    shippingMethod: normalizeShippingMethod(String(rawOrder['shippingMethod'] ?? rawOrder['shipping_method'] ?? apiOrder.shippingMethod ?? '')),
    shippingStatus: String(rawOrder['shippingStatus'] ?? rawOrder['shipping_status'] ?? apiOrder.shippingStatus ?? ''),
    trackingNumber: String(rawOrder['trackingNumber'] ?? rawOrder['tracking_number'] ?? apiOrder.trackingNumber ?? ''),
    trackingUrl: String(rawOrder['trackingUrl'] ?? rawOrder['tracking_url'] ?? apiOrder.trackingUrl ?? ''),
    carrier: String(rawOrder['carrier'] ?? apiOrder.carrier ?? ''),
    labelUrl: String(rawOrder['labelUrl'] ?? rawOrder['label_url'] ?? apiOrder.labelUrl ?? ''),
    selectedRateId: String(rawOrder['selectedRateId'] ?? rawOrder['selected_rate_id'] ?? apiOrder.selectedRateId ?? ''),
    selectedRateService: String(rawOrder['selectedRateService'] ?? rawOrder['selected_rate_service'] ?? apiOrder.selectedRateService ?? ''),
    selectedRateCurrency: String(rawOrder['selectedRateCurrency'] ?? rawOrder['selected_rate_currency'] ?? apiOrder.selectedRateCurrency ?? ''),
    selectedRateAmount: Number(rawOrder['selectedRateAmount'] ?? rawOrder['selected_rate_amount'] ?? apiOrder.selectedRateAmount ?? 0),
    testShipment: Boolean(rawOrder['testShipment'] ?? rawOrder['test_shipment'] ?? false),
    orderLines: rawLines.map(mapApiOrderLineToViewModel),
  };
}

function mapApiOrderLineToViewModel(line: AdminOrderLineApiModel): OrderLineViewModel {
  const rawLine = line as unknown as Record<string, unknown>;
  return {
    orderLineId: String(rawLine['orderLineId'] ?? rawLine['order_line_id'] ?? line.orderLineId ?? ''),
    bookId: Number(rawLine['bookId'] ?? rawLine['book_id'] ?? line.bookId ?? 0),
    title: String(rawLine['title'] ?? line.title ?? ''),
    itemSource: String(rawLine['itemSource'] ?? rawLine['item_source'] ?? line.itemSource ?? 'MARKETPLACE') === 'CUSTOM' ? 'CUSTOM' : 'MARKETPLACE',
    lineStatus: mapApiLineStatusToUi(String(rawLine['lineStatus'] ?? rawLine['line_status'] ?? line.lineStatus ?? 'READY')),
    priority: mapApiPriorityToDisplay(String(rawLine['priority'] ?? line.priority ?? 'NORMAL')),
    validationStatus: String(rawLine['validationStatus'] ?? rawLine['validation_status'] ?? line.validationStatus ?? 'PENDING'),
    quantity: Number(rawLine['quantity'] ?? line.quantity ?? 0),
    unitPrice: Number(rawLine['unitPrice'] ?? rawLine['unit_price'] ?? line.unitPrice ?? 0),
    totalPrice: Number(rawLine['totalPrice'] ?? rawLine['total_price'] ?? line.totalPrice ?? 0),
    isEstimated: Boolean(rawLine['isEstimated'] ?? rawLine['is_estimated'] ?? line.isEstimated ?? false),
    currency: String(rawLine['currency'] ?? line.currency ?? 'USD'),
  };
}

function resolveRawOrderLines(rawOrder: Record<string, unknown>): AdminOrderLineApiModel[] {
  const candidates = [
    rawOrder['orderLines'],
    rawOrder['orderlines'],
    rawOrder['order_lines'],
    rawOrder['lines'],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as AdminOrderLineApiModel[];
    }
  }
  return [];
}

function mapApiStatusToFilter(apiStatus: string): OrderFilter {
  switch (apiStatus) {
    case 'IN_PRODUCTION': return 'Printing';
    case 'READY_TO_SHIP': return 'Ready to ship';
    case 'SHIPPED': return 'Shipped';
    case 'REJECTED': return 'Rejected';
    case 'CANCELLED': return 'Cancelled';
    default: return 'Pending';
  }
}

function mapApiLineStatusToUi(apiStatus?: string): OrderLineStatusUi {
  switch (apiStatus) {
    case 'PENDING': return 'PENDING';
    case 'VALIDATED': return 'VALIDATED';
    case 'READY': return 'READY';
    case 'REJECTED': return 'REJECTED';
    case 'PRINTING': return 'PRINTING';
    case 'READY_TO_SHIP': return 'READY_TO_SHIP';
    default: return 'READY';
  }
}

function mapApiPriorityToDisplay(apiPriority?: string): OrderLinePriorityDisplay {
  switch (apiPriority) {
    case 'NORMAL': return 'LOW';
    case 'HIGH1': return 'MEDIUM';
    case 'HIGH2':
    case 'HIGH3': return 'HIGH';
    default: return 'LOW';
  }
}

export function mapDisplayPriorityToApi(displayPriority: OrderLinePriorityDisplay): string {
  switch (displayPriority) {
    case 'LOW': return 'NORMAL';
    case 'MEDIUM': return 'HIGH1';
    case 'HIGH': return 'HIGH3';
    default: return 'NORMAL';
  }
}

export function mapUiStatusToApi(uiStatus: string): string {
  switch (uiStatus) {
    case 'Shipped': return 'SHIPPED';
    case 'Rejected': return 'REJECTED';
    case 'Cancelled': return 'CANCELLED';
    default: return 'SHIPPED';
  }
}

function normalizeShippingMethod(value: string): string {
  const normalized = (value ?? '').trim().toUpperCase();
  if (normalized === 'FULLTRUCKLOAD_DHL' || normalized === 'FULL_TRUCKLOAD') return 'full_truckload';
  if (normalized === 'FREIGHTSHIPPING' || normalized === 'FREIGHT_SHIPPING') return 'freight_shipping';
  if (normalized === 'STANDARD') return 'standard';
  if (normalized === 'EXPRESS') return 'express';
  return value?.toLowerCase?.() ?? '';
}
