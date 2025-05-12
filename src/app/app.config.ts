import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAuth0 } from '@auth0/auth0-angular';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideAuth0({
      domain: 'followfin.ca.auth0.com',
      clientId: '1ooECMr4GdCYMJFJpjiWxDkOIdT23OMq',
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
  ]
};
