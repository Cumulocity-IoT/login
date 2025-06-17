import './polyfills';
import '@angular/compiler';

import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { BootstrapLoginComponent } from './app/bootstrap-login/bootstrap-login.component';
import { provideBootstrapMetadata } from '@c8y/ngx-components';
import { BootstrapMetaData } from '@c8y/bootstrap';

declare const __MODE__: string;
if (__MODE__ === 'production') {
  enableProdMode();
}

export function bootstrap(metadata: BootstrapMetaData) {
  appConfig.providers.push(...provideBootstrapMetadata(metadata));
  return bootstrapApplication(BootstrapLoginComponent, appConfig).catch(err => console.log(err));
}
