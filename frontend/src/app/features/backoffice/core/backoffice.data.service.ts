import {Injectable, computed, signal} from '@angular/core';
import {
    BackofficeActivity,
    BackofficeAlert,
    BackofficeNavItem,
    BackofficeOrder,
    BackofficeOrderDraft,
    DashboardMetric,
    EmployeeRecord,
    InventoryProduct,
    WorkspaceSettings,
} from './backoffice.models';

const INITIAL_ORDERS: BackofficeOrder[] = [
    {
        id: 'order-1',
        reference: 'ORD-26-1043',
        customerName: 'Sophie Martin',
        companyName: 'Northwind Atelier',
        channel: 'B2B Portal',
        submittedAt: '2026-03-20',
        dueDate: '2026-03-25',
        total: 1680,
        status: 'In Production',
        priority: 'High',
        assignee: 'Foulen Foulen',
        items: 4,
        shippingMethod: 'Express',
        paymentStatus: 'Paid',
        notes: 'Requires foil proof approval before packing.',
    },
    {
        id: 'order-2',
        reference: 'ORD-26-1042',
        customerName: 'Adam Clark',
        companyName: 'Blue Harbor Events',
        channel: 'Sales Assisted',
        submittedAt: '2026-03-21',
        dueDate: '2026-03-24',
        total: 940,
        status: 'Delayed',
        priority: 'Critical',
        assignee: 'Lina Trabelsi',
        items: 2,
        shippingMethod: 'Pickup',
        paymentStatus: 'Partial',
        notes: 'Waiting on corrected artwork for banner panel.',
    },
    {
        id: 'order-3',
        reference: 'ORD-26-1039',
        customerName: 'Yasmine Gharbi',
        companyName: 'Studio Papier',
        channel: 'Marketplace',
        submittedAt: '2026-03-18',
        dueDate: '2026-03-23',
        total: 540,
        status: 'Ready to Ship',
        priority: 'Normal',
        assignee: 'Hedi Mansour',
        items: 6,
        shippingMethod: 'Standard',
        paymentStatus: 'Paid',
        notes: 'Bundle postcards and retail inserts together.',
    },
    {
        id: 'order-4',
        reference: 'ORD-26-1035',
        customerName: 'Karim Lopez',
        companyName: 'Cobalt Labs',
        channel: 'Marketplace',
        submittedAt: '2026-03-17',
        dueDate: '2026-03-27',
        total: 1290,
        status: 'Prepress',
        priority: 'High',
        assignee: 'Meriem Gharbi',
        items: 3,
        shippingMethod: 'Express',
        paymentStatus: 'Pending',
        notes: 'Spot UV sample queued for internal review.',
    },
    {
        id: 'order-5',
        reference: 'ORD-26-1031',
        customerName: 'Nour Hadid',
        companyName: 'Maison Bloom',
        channel: 'Account Manager',
        submittedAt: '2026-03-15',
        dueDate: '2026-03-26',
        total: 2380,
        status: 'Pending Review',
        priority: 'Normal',
        assignee: 'Foulen Foulen',
        items: 5,
        shippingMethod: 'Express',
        paymentStatus: 'Paid',
        notes: 'Pending client sign-off on packaging dieline.',
    },
    {
        id: 'order-6',
        reference: 'ORD-26-1027',
        customerName: 'Imen Foster',
        companyName: 'Verve Hospitality',
        channel: 'B2B Portal',
        submittedAt: '2026-03-12',
        dueDate: '2026-03-22',
        total: 720,
        status: 'Completed',
        priority: 'Low',
        assignee: 'Lina Trabelsi',
        items: 2,
        shippingMethod: 'Standard',
        paymentStatus: 'Paid',
        notes: 'Delivered to downtown showroom.',
    },
];

const INITIAL_INVENTORY: InventoryProduct[] = [
    {
        id: 'inventory-1',
        sku: 'BK-COAT-130',
        name: 'Silk coated cover stock',
        category: 'Paper',
        stock: 620,
        reorderPoint: 400,
        coverageDays: 16,
        incomingUnits: 0,
        leadTimeDays: 6,
        location: 'Aisle A2',
        status: 'Healthy',
    },
    {
        id: 'inventory-2',
        sku: 'INK-CMYK-SET',
        name: 'CMYK production ink set',
        category: 'Ink',
        stock: 48,
        reorderPoint: 60,
        coverageDays: 5,
        incomingUnits: 120,
        leadTimeDays: 4,
        location: 'Aisle C1',
        status: 'Incoming',
    },
    {
        id: 'inventory-3',
        sku: 'LUX-FOIL-GD',
        name: 'Gold foil roll',
        category: 'Finishing',
        stock: 12,
        reorderPoint: 20,
        coverageDays: 2,
        incomingUnits: 0,
        leadTimeDays: 9,
        location: 'Aisle F4',
        status: 'Reorder now',
    },
    {
        id: 'inventory-4',
        sku: 'PKG-RIGID-S',
        name: 'Rigid mailer small format',
        category: 'Packaging',
        stock: 86,
        reorderPoint: 90,
        coverageDays: 6,
        incomingUnits: 200,
        leadTimeDays: 3,
        location: 'Aisle D3',
        status: 'Low stock',
    },
];

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
    {
        id: 'employee-1',
        name: 'foulen foulen',
        role: 'Production Lead',
        state: 'On Shift',
        shift: '08:00 - 16:00',
        email: 'rim@epac.local',
        workloadPercent: 82,
        activeOrders: 14,
        phone: '+216 71 555 210',
    },
    {
        id: 'employee-2',
        name: 'Lina Trabelsi',
        role: 'Prepress Specialist',
        state: 'Reviewing',
        shift: '09:00 - 17:00',
        email: 'lina@epac.local',
        workloadPercent: 74,
        activeOrders: 9,
        phone: '+216 71 555 211',
    },
    {
        id: 'employee-3',
        name: 'Meriem Gharbi',
        role: 'Customer Success',
        state: 'Remote',
        shift: '10:00 - 18:00',
        email: 'meriem@epac.local',
        workloadPercent: 61,
        activeOrders: 7,
        phone: '+216 71 555 212',
    },
    {
        id: 'employee-4',
        name: 'Hedi Mansour',
        role: 'Logistics Coordinator',
        state: 'Offline',
        shift: '07:00 - 15:00',
        email: 'hedi@epac.local',
        workloadPercent: 38,
        activeOrders: 4,
        phone: '+216 71 555 213',
    },
];

const INITIAL_SETTINGS: WorkspaceSettings = {
    workspaceName: 'EPAC Operations Workspace',
    supportEmail: 'ops@epac.local',
    timezone: 'Africa/Tunis',
    defaultDueWindowDays: 5,
    autoAssignOrders: true,
    digestFrequency: 'Daily',
    lowStockThreshold: 80,
    accentMode: 'Balanced',
};

@Injectable({providedIn: 'root'})
export class BackofficeDataService {

    readonly orders = signal<BackofficeOrder[]>(INITIAL_ORDERS);
    readonly inventory = signal<InventoryProduct[]>(INITIAL_INVENTORY);
    readonly employees = signal<EmployeeRecord[]>(INITIAL_EMPLOYEES);
    readonly settings = signal<WorkspaceSettings>(INITIAL_SETTINGS);
    readonly delayedOrders = computed(() => this.orders().filter((order) => order.status === 'Delayed').length);
    readonly activeOrders = computed(() =>
        this.orders().filter((order) => order.status !== 'Completed').length,
    );
    readonly orderValue = computed(() =>
        this.orders()
            .filter((order) => order.status !== 'Completed')
            .reduce((total, order) => total + order.total, 0),
    );
    readonly lowStockItems = computed(() =>
        this.inventory().filter((product) => product.status === 'Low stock' || product.status === 'Reorder now').length,
    );
    readonly activeEmployees = computed(() =>
        this.employees().filter((employee) => employee.state !== 'Offline').length,
    );

    readonly dashboardMetrics = computed<DashboardMetric[]>(() => [
        {
            label: 'Open orders',
            value: `${this.activeOrders()}`,
            change: '+12%',
            hint: 'vs last Monday',
            icon: 'fa-layer-group',
            tone: 'positive',
        },
        {
            label: 'Production value',
            value: `$${Math.round(this.orderValue()).toLocaleString()}`,
            change: '+$4.1k',
            hint: 'live pipeline',
            icon: 'fa-chart-line',
            tone: 'neutral',
        },
        {
            label: 'Inventory alerts',
            value: `${this.lowStockItems()}`,
            change: this.lowStockItems() > 0 ? 'Needs action' : 'Healthy',
            hint: 'below target',
            icon: 'fa-boxes-stacked',
            tone: this.lowStockItems() > 0 ? 'warning' : 'positive',
        },
        {
            label: 'Team availability',
            value: `${this.activeEmployees()}/${this.employees().length}`,
            change: this.delayedOrders() > 0 ? 'Rebalance' : 'On track',
            hint: 'staff online',
            icon: 'fa-user-group',
            tone: this.delayedOrders() > 0 ? 'warning' : 'positive',
        },
    ]);

    readonly attentionItems = computed<BackofficeAlert[]>(() => {
        const alerts: BackofficeAlert[] = [];

        if (this.delayedOrders() > 0) {
            alerts.push({
                id: 'alert-delayed-orders',
                title: `${this.delayedOrders()} delayed order${this.delayedOrders() > 1 ? 's' : ''}`,
                description: 'Review blockers and update dispatch timing.',
                route: '/backoffice/orders',
                icon: 'fa-triangle-exclamation',
                tone: 'danger',
            });
        }

        if (this.lowStockItems() > 0) {
            alerts.push({
                id: 'alert-inventory',
                title: `${this.lowStockItems()} inventory threshold alert${this.lowStockItems() > 1 ? 's' : ''}`,
                description: 'Gold foil and mailers need replenishment.',
                route: '/backoffice/inventory',
                icon: 'fa-box-open',
                tone: 'warning',
            });
        }

        alerts.push({
            id: 'alert-team',
            title: 'Morning allocation sync',
            description: 'Assign backup approval coverage for midday.',
            route: '/backoffice/employees',
            icon: 'fa-calendar-check',
            tone: 'neutral',
        });

        return alerts;
    });

    readonly recentActivity = computed<BackofficeActivity[]>(() => [
        {
            id: 'activity-1',
            title: 'Packaging spec updated',
            description: 'Northwind approved the revised rigid box dieline.',
            timestamp: '12 minutes ago',
            route: '/backoffice/orders',
            icon: 'fa-pen-ruler',
            tone: 'neutral',
        },
        {
            id: 'activity-2',
            title: 'Stock ETA confirmed',
            description: 'CMYK ink lands tomorrow at 09:30.',
            timestamp: '34 minutes ago',
            route: '/backoffice/inventory',
            icon: 'fa-truck-fast',
            tone: 'positive',
        },
        {
            id: 'activity-3',
            title: 'Team note added',
            description: 'Blue Harbor artwork change flagged for priority review.',
            timestamp: '1 hour ago',
            route: '/backoffice/employees',
            icon: 'fa-comments',
            tone: 'warning',
        },
    ]);

    readonly recentOrders = computed(() =>
        [...this.orders()].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt)).slice(0, 5),
    );

    readonly navItems = computed<BackofficeNavItem[]>(() => [
        {
            label: 'Dashboard',
            route: '/backoffice/dashboard',
            icon: 'fa-chart-pie',
            description: 'Operations overview',
            group: 'Operations',
            exact: true,
        },
        {
            label: 'Orders',
            route: '/backoffice/orders',
            icon: 'fa-receipt',
            description: 'Track production jobs',
            group: 'Operations',
            badge: this.delayedOrders() > 0 ? `${this.delayedOrders()}` : undefined,
        },
        {
            label: 'Inventory',
            route: '/backoffice/inventory',
            icon: 'fa-boxes-stacked',
            description: 'Monitor stock health',
            group: 'Operations',
            badge: this.lowStockItems() > 0 ? `${this.lowStockItems()}` : undefined,
        },
        {
            label: 'My Templates',
            route: '/backoffice/templates',  // 👈 Changé de 'Template' à 'templates' (minuscules)
            icon: 'fa-copy',
            description: 'Manage your saved templates',
            group: 'Design',
            // badge: this.lowStockItems() > 0 ? `${this.lowStockItems()}` : undefined, // À adapter plus tard
        },
        {
            label: 'Template Editor',  // 👈 Ajout d'un item pour l'éditeur
            route: '/backoffice/editor',
            icon: 'fa-pen-ruler',
            description: 'Create and edit custom templates',
            group: 'Design',
            exact: false,
        },
        {
            label: 'Employees',
            route: '/backoffice/employees',
            icon: 'fa-user-group',
            description: 'Coordinate the team',
            group: 'Workspace',
        },
        {
            label: 'Users',
            route: '/backoffice/users',
            icon: 'fa-user-shield',
            description: 'Manage users and roles',
            group: 'Workspace',
        },
        {
            label: 'Settings',
            route: '/backoffice/settings',
            icon: 'fa-sliders',
            description: 'Workspace controls',
            group: 'Workspace',
        },
    ]);

    createOrder(draft: BackofficeOrderDraft): void {
        const nextSequence = this.orders().length + 1044;
        const nextOrder: BackofficeOrder = {
            id: `order-${nextSequence}`,
            reference: draft.reference.trim() || `ORD-26-${nextSequence}`,
            customerName: draft.customerName.trim(),
            companyName: draft.companyName.trim(),
            channel: draft.channel.trim(),
            submittedAt: draft.submittedAt,
            dueDate: draft.dueDate,
            total: draft.total,
            status: draft.status,
            priority: draft.priority,
            assignee: draft.assignee.trim(),
            items: draft.items,
            shippingMethod: draft.shippingMethod.trim(),
            paymentStatus: draft.paymentStatus,
            notes: draft.notes.trim(),
        };

        this.orders.update((orders) =>
            [nextOrder, ...orders].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt)),
        );
    }

    updateOrder(id: string, draft: BackofficeOrderDraft): void {
        this.orders.update((orders) =>
            orders.map((order) =>
                order.id === id
                    ? {
                        ...order,
                        reference: draft.reference.trim(),
                        customerName: draft.customerName.trim(),
                        companyName: draft.companyName.trim(),
                        channel: draft.channel.trim(),
                        submittedAt: draft.submittedAt,
                        dueDate: draft.dueDate,
                        total: draft.total,
                        status: draft.status,
                        priority: draft.priority,
                        assignee: draft.assignee.trim(),
                        items: draft.items,
                        shippingMethod: draft.shippingMethod.trim(),
                        paymentStatus: draft.paymentStatus,
                        notes: draft.notes.trim(),
                    }
                    : order,
            ),
        );
    }

    deleteOrder(id: string): void {
        this.orders.update((orders) => orders.filter((order) => order.id !== id));
    }

    markInventoryIncoming(id: string): void {
        this.inventory.update((products) =>
            products.map((product) =>
                product.id === id
                    ? {
                        ...product,
                        incomingUnits: Math.max(product.incomingUnits, product.reorderPoint * 2),
                        status: 'Incoming',
                    }
                    : product,
            ),
        );
    }

    saveSettings(settings: WorkspaceSettings): void {
        this.settings.set({...settings});
    }
}
