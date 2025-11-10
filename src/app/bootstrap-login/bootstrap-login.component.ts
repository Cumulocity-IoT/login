import { Component } from '@angular/core';
import { CookieBannerComponent } from '@c8y/ngx-components';
import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'c8y-bootstrap',
  templateUrl: './bootstrap-login.component.html',
  standalone: true,
  imports: [LoginComponent, CookieBannerComponent]
})
export class BootstrapLoginComponent {}
