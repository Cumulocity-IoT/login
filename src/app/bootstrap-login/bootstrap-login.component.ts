import { Component } from '@angular/core';
import { CookieBannerComponent, TranslationLoaderService } from '@c8y/ngx-components';
import { LoginComponent } from '../login';

@Component({
  selector: 'c8y-bootstrap',
  templateUrl: './bootstrap-login.component.html',
  standalone: true,
  imports: [LoginComponent, CookieBannerComponent]
})
export class BootstrapLoginComponent {
  constructor(
    // only here to ensure the service is instantiated
    public translationLoaderService: TranslationLoaderService
  ) {}
}
