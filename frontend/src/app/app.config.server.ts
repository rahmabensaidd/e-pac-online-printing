import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';   // ← Important : ajoute withRoutes
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';   // ← Importe tes serverRoutes

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(
        withRoutes(serverRoutes)   // ← C'est ici que ça se passe
    ),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);