import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CoreModule, provideSkipAppKeyHeader, RouterModule } from '@c8y/ngx-components';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideAnimations(),
    importProvidersFrom(RouterModule.forRoot()),
    importProvidersFrom(CoreModule.forRoot()),
    provideSkipAppKeyHeader(),
  ],
};
