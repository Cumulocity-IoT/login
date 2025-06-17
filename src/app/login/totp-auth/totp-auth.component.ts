import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { ICredentials, UserService } from '@c8y/client';
import {
  AlertService,
  C8yTranslateDirective,
  TotpSetupComponent,
  TotpChallengeComponent,
  AppStateService
} from '@c8y/ngx-components';
import { LoginService } from '../login.service';
import { LoginEvent, LoginViews } from '../login.model';
import { gettext } from '@c8y/ngx-components/gettext';
import { NgIf } from '@angular/common';

@Component({
  selector: 'c8y-totp-auth',
  templateUrl: './totp-auth.component.html',
  standalone: true,
  imports: [C8yTranslateDirective, NgIf, TotpSetupComponent, TotpChallengeComponent]
})
export class TotpAuthComponent implements OnInit {
  @Input() credentials: ICredentials;
  @Input() view: LoginViews;
  @Output() onCancel = new EventEmitter();
  @Output() onChangeView = new EventEmitter<LoginEvent>();
  LOGIN_VIEWS = LoginViews;
  loading = false;
  hasError = false;
  isSetup = false;

  constructor(
    public loginService: LoginService,
    private userService: UserService,
    private alert: AlertService,
    private appState: AppStateService
  ) {}

  ngOnInit() {
    if (this.view === this.LOGIN_VIEWS.TotpSetup) {
      this.isSetup = true;
    }
  }

  async onTotpSuccess(code: string) {
    try {
      this.loading = true;
      this.hasError = false;
      this.credentials.tfa = code;
      if (this.isSetup) {
        await this.userService.activateTotp();
      }
      await this.loginService.switchLoginMode(this.credentials);
      await this.loginService.authFulfilled();
      const result = await this.loginService.ensureUserPermissionsForRedirect(
        this.appState.currentUser.value
      );
      if (!result) {
        this.onChangeView.emit({ view: LoginViews.MissingApplicationAccess });
      }
    } catch (e) {
      this.alert.removeLastDanger();
      if (e.data && e.data.message === 'Authentication failed! : User account is locked') {
        this.alert.warning(gettext('Authentication failed due to: user account is locked.'));
      } else {
        this.alert.addServerFailure(e);
        this.hasError = true;
      }
    } finally {
      this.loading = false;
    }
  }
}
