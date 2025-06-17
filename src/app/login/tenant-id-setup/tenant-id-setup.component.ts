import { Component, Output, EventEmitter } from '@angular/core';
import { LoginEvent, LoginViews } from '../login.model';
import { FetchClient } from '@c8y/client';
import {
  AppStateService,
  AlertService,
  C8yTranslateDirective,
  FormGroupComponent,
  RequiredInputPlaceholderDirective,
  C8yTranslatePipe
} from '@c8y/ngx-components';
import { LoginService } from '../login.service';
import { TranslateService } from '@ngx-translate/core';
import { gettext } from '@c8y/ngx-components/gettext';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'c8y-tenant-id-setup',
  templateUrl: './tenant-id-setup.component.html',
  styles: [],
  standalone: true,
  imports: [
    FormsModule,
    C8yTranslateDirective,
    FormGroupComponent,
    RequiredInputPlaceholderDirective,
    C8yTranslatePipe
  ]
})

/**
 * `TenantIdSetupComponent` is intended to be shown when tenant's id cannot be determined based on the current URL.
 * It asks the user to provide target tenant's id and then it fetches login options for this tenant.
 * In case of OAI-Secure login mode, login options will contain `domain` property set by backend.
 * The component will redirect user to this domain, preserving URL path and params.
 */
export class TenantIdSetupComponent {
  @Output() onChangeView = new EventEmitter<LoginEvent>();
  LOGIN_VIEWS = LoginViews;
  model = {
    tenant: ''
  };

  constructor(
    private client: FetchClient,
    private ui: AppStateService,
    private loginService: LoginService,
    private alert: AlertService,
    private translateService: TranslateService
  ) {}

  /**
   * Sets up login mode for particular tenant. In case of OAI-Secure will redirect user to tenant domain.
   */
  async setupLoginMode() {
    this.client.tenant = this.model.tenant;
    try {
      await this.ui.refreshLoginOptions();
      this.loginService.initLoginOptions();
      this.redirectToCorrectDomain();
    } catch (e) {
      if (e.res && e.res.status === 401) {
        this.alert.danger(
          this.translateService.instant(
            gettext('Could not find tenant with ID "{{ tenantId }}".'),
            { tenantId: this.model.tenant }
          )
        );
      } else {
        this.alert.addServerFailure(e);
      }
    }
  }

  /**
   * Redirects to tenant domain when login mode contains domain.
   */
  redirectToCorrectDomain() {
    const loginRedirectDomain = this.loginService.loginMode.loginRedirectDomain;
    if (loginRedirectDomain) {
      const alreadyOnCorrectDomain = window.location.href.includes(loginRedirectDomain);
      if (!alreadyOnCorrectDomain) {
        this.loginService.redirectToDomain(loginRedirectDomain);
      } else {
        this.onChangeView.emit({
          view: LoginViews.Credentials,
          loginViewParams: { showTenant: true, disableTenant: true }
        });
      }
    } else {
      this.onChangeView.emit({ view: LoginViews.Credentials });
    }
  }
}
