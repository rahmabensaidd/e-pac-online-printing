import { Routes } from '@angular/router';
import { BackofficeShellComponent } from './layout/backoffice-shell';

export const BACKOFFICE_ROUTES: Routes = [
  {
    path: '',
    component: BackofficeShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/backoffice-dashboard-page').then(
            (m) => m.BackofficeDashboardPageComponent,
          ),
        data: {
          title: 'Dashboard',
          description: 'Monitor today’s production pulse, queue risk, and team readiness at a glance.',
        },
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./orders/backoffice-orders-page').then((m) => m.BackofficeOrdersPageComponent),
        data: {
          title: 'Orders',
          description: 'Create, prioritize, and adjust production orders without leaving the workspace.',
        },
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./inventory/backoffice-inventory-page').then(
            (m) => m.BackofficeInventoryPageComponent,
          ),
        data: {
          title: 'Inventory',
          description: 'Track stock coverage, replenishment risk, and incoming materials.',
        },
      },
      // Dans votre fichier de routes
      {
        path: 'editor',
        // ✅ Chargez directement le composant page - il gère lui-même le chargement dynamique
        loadComponent: () => import('./Templates/backoffice-Template-page').then(
            (m) => m.BackofficeTemplatePageComponent
        ),
        data: {
          title: 'Template Editor',
          description: 'Create and edit custom templates for your designs.',
        },
      },

      {
        path: 'employees',
        loadComponent: () =>
          import('./employees/backoffice-employees-page').then(
            (m) => m.BackofficeEmployeesPageComponent,
          ),
        data: {
          title: 'Employees',
          description: 'Balance team workload and keep production hand-offs visible across shifts.',
        },
      },
      {
        path: 'users/:userId/orders',
        loadComponent: () =>
          import('./users/backoffice-user-orders-page').then(
            (m) => m.BackofficeUserOrdersPageComponent,
          ),
        data: {
          title: 'User Orders',
          description: 'View user profile and all linked orders.',
        },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users/backoffice-users-page').then(
            (m) => m.BackofficeUsersPageComponent,
          ),
        data: {
          title: 'Users',
          description: 'Manage users, assign roles, and maintain account access.',
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/backoffice-settings-page').then(
            (m) => m.BackofficeSettingsPageComponent,
          ),
        data: {
          title: 'Settings',
          description: 'Manage workspace defaults, alerts, and operational thresholds.',
        },
      },
    ],
  },
];
