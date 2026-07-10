import { Component, inject } from '@angular/core';
import { AppSwitcherInlineComponent, C8yTranslatePipe, IconDirective } from '@c8y/ngx-components';
import { LoginService } from '../login.service';

@Component({
  selector: 'c8y-missing-application-access',
  templateUrl: './missing-application-access.component.html',
  standalone: true,
  imports: [AppSwitcherInlineComponent, C8yTranslatePipe, IconDirective],
})
export class MissingApplicationAccessComponent {
  private loginService = inject(LoginService);

  logout() {
    this.loginService.logout();
  }
}
