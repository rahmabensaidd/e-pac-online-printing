import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page';

export const routes: Routes = [
  { path: '', component: HomePageComponent, pathMatch: 'full' },
  {
    path: 'marketplace',
    loadComponent: () => import('./pages/marketplace/marketplace-page').then((m) => m.MarketplacePageComponent),
  },
  {
    path: 'price-simulator',
    loadComponent: () =>
      import('./pages/price-simulator/price-simulator-page').then((m) => m.PriceSimulatorPageComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./pages/product-details/product-details-page').then((m) => m.ProductDetailsPageComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/sign-in/sign-in').then((m) => m.SignInComponent),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout-page').then((m) => m.CheckoutPageComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'forget-password',
    redirectTo: 'forgot-password',
    pathMatch: 'full',
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/auth/sign-up/sign-up').then((m) => m.SignUpComponent),
  },
  {
    path: 'backoffice',
    loadChildren: () =>
      import('./features/backoffice/backoffice.routes').then((m) => m.BACKOFFICE_ROUTES),
  },
  {
    path: 'admin',
    redirectTo: 'backoffice',
    pathMatch: 'full',
  },
  {
    path: '500',
    loadComponent: () =>
      import('./pages/errors/server-error/server-error').then((m) => m.ServerErrorComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/errors/not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
