import { Component, inject } from '@angular/core';
import { AppSwitcherInlineComponent, AlertService } from '@c8y/ngx-components';
import { gettext } from '@c8y/ngx-components/gettext';

@Component({
  selector: 'c8y-missing-application-access',
  templateUrl: './missing-application-access.component.html',
  standalone: true,
  imports: [AppSwitcherInlineComponent]
})
export class MissingApplicationAccessComponent {
  private alertService = inject(AlertService);

  constructor() {
    this.alertService.warning(
      gettext(
        `The application you've been trying to access is not available. Verify if you have the required permissions to access this application.`
      )
    );
  }
}
