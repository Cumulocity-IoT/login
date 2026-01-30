import { Component, Output, EventEmitter, Input } from '@angular/core';
import { UserService, ICredentials } from '@c8y/client';
import { LoginService } from '../login.service';
import {
  AlertService,
  C8yTranslateDirective,
  FormGroupComponent,
  RequiredInputPlaceholderDirective,
  C8yTranslatePipe,
  AppStateService
} from '@c8y/ngx-components';
import { gettext } from '@c8y/ngx-components/gettext';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LoginEvent, LoginViews } from '../login.model';

@Component({
  selector: 'c8y-sms-challenge',
  templateUrl: './sms-challenge.component.html',
  styles: [],
  standalone: true,
  imports: [
    FormsModule,
    C8yTranslateDirective,
    FormGroupComponent,
    RequiredInputPlaceholderDirective,
    NgClass,
    C8yTranslatePipe
  ]
})
export class SmsChallengeComponent {
  @Input() credentials: ICredentials;
  @Output() onCancel = new EventEmitter();
  @Output() onChangeView = new EventEmitter<LoginEvent>();

  model = {
    smsToken: ''
  };
  isLoading = false;

  private resendTfa = '0';

  constructor(
    public loginService: LoginService,
    private users: UserService,
    private alert: AlertService,
    private appState: AppStateService
  ) {}

  async verifyTFACode() {
    this.isLoading = true;
    if (await this.usesOAuthInternal()) {
      await this.verifyCodeWithOauth();
    } else {
      await this.verifyCodeWithBasicAuth();
    }
    this.isLoading = false;
  }

  async resendTFASms() {
    try {
      this.isLoading = true;
      await this.users.verifyTFACode(this.resendTfa);
    } catch (e) {
      if (e.res.status === 403) {
        this.loginService.cleanMessages();
        this.loginService.addSuccessMessage('resend_sms');
      } else {
        this.alert.addServerFailure(e);
      }
    } finally {
      this.isLoading = false;
    }
  }

  private async usesOAuthInternal() {
    return this.loginService.isPasswordGrantLogin();
  }

  private async verifyCodeWithOauth() {
    try {
      const { credentials } = this;
      await this.loginService.switchLoginMode({ ...credentials, tfa: this.model.smsToken });
      await this.loginService.authFulfilled();
      const result = await this.loginService.ensureUserPermissionsForRedirect(
        this.appState.currentUser.value
      );
      if (!result) {
        this.onChangeView.emit({ view: LoginViews.MissingApplicationAccess });
      }
    } catch (e) {
      const resStatus = e.res && e.res.status;
      if (resStatus === 401) {
        // it is assumed that the user and password are correct so it must be the tfa code
        this.alert.danger(gettext('Invalid code'));
      } else {
        this.alert.addServerFailure(e);
      }
    }
  }

  private async verifyCodeWithBasicAuth() {
    try {
      const { res } = await this.users.verifyTFACode(this.model.smsToken);
      const tfaToken = res.headers.get('tfatoken');
      this.credentials.tfa = tfaToken;
      await this.loginWithTFA(tfaToken);
    } catch (e) {
      const resStatus = e.res && e.res.status;
      // BE returns 403 in case of invalid tfa code
      if (resStatus === 403) {
        this.alert.danger(gettext('Invalid code'));
      } else {
        this.alert.addServerFailure(e);
      }
    }
  }

  private async loginWithTFA(tfaToken) {
    try {
      await this.loginService.login(
        this.loginService.useBasicAuth({ tfa: tfaToken }),
        this.credentials
      );
      this.loginService.saveTFAToken(tfaToken, sessionStorage);
      if (this.loginService.rememberMe) {
        this.loginService.saveTFAToken(tfaToken, localStorage);
      }
    } catch (e) {
      this.alert.addServerFailure(e);
    }
  }
}
