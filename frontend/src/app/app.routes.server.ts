import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'products/:id',
    renderMode: RenderMode.Server,
  },

  {
    path: 'backoffice/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'checkout',
    renderMode: RenderMode.Client,
  },
  {
    path: 'design-your-book',
    renderMode: RenderMode.Client,
  },
  {
    path: 'design-studio',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-custom-books',
    renderMode: RenderMode.Client,
  },
  {
    path: 'marketplace',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
