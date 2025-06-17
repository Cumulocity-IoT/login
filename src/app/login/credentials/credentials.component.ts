import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { LoginService } from '../login.service';
import { ICredentials } from '@c8y/client';
import {
  AlertService,
  IconDirective,
  C8yTranslateDirective,
  FormGroupComponent,
  RequiredInputPlaceholderDirective,
  PasswordInputComponent,
  C8yTranslatePipe
} from '@c8y/ngx-components';
import { gettext } from '@c8y/ngx-components/gettext';
import { LoginEvent, LoginViews } from '../login.model';
import { CredentialsFromQueryParamsService } from '../credentials-from-query-params.service';
import { CredentialsComponentParams } from '../credentials-component-params';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'c8y-credentials',
  templateUrl: './credentials.component.html',
  styles: [],
  standalone: true,
  imports: [
    NgIf,
    IconDirective,
    FormsModule,
    C8yTranslateDirective,
    FormGroupComponent,
    RequiredInputPlaceholderDirective,
    PasswordInputComponent,
    C8yTranslatePipe
  ]
})
export class CredentialsComponent implements OnInit {
  @Output() onChangeView = new EventEmitter<LoginEvent>();

  @Input() loginViewParams: CredentialsComponentParams = {
    disableTenant: false,
    showTenant: false
  };

  LOGIN_VIEWS = LoginViews;
  model: ICredentials = {};
  isLoading = false;
  showLoginForm = false;
  showBasicAuth = false;
  oauthOptions: any = {};
  showTenant = false;

  private readonly PASSWORD_RESET_HEADER_NAME = 'passwordresettoken';
  private readonly NO_PHONE_HEADER_NAME = 'NoPhoneHeader';

  constructor(
    public loginService: LoginService,
    public alert: AlertService,
    private credentialsFromQueryParamsService: CredentialsFromQueryParamsService
  ) {}

  ngOnInit() {
    const { oauthOptions, loginMode } = this.loginService;
    this.model.tenant = this.loginService.getTenant();
    this.showLoginForm =
      typeof loginMode.visibleOnLoginPage === 'undefined' || loginMode.visibleOnLoginPage;
    this.showBasicAuth = loginMode.type === 'BASIC';
    this.oauthOptions = oauthOptions;
    const credentialsFromQueryParams =
      this.credentialsFromQueryParamsService.getCredentialsFromQueryParams();
    Object.assign(this.model, credentialsFromQueryParams);
    this.showTenant = this.loginViewParams.showTenant || this.loginService.showTenant();
  }

  redirectToOauth() {
    this.loginService.redirectToOauth();
  }

  /**
   * Allows to login into the application using basic auth.
   * If successful logged in the client is set in shared/cumulocity.service.ts
   */
  async login() {
    try {
      this.isLoading = true;
      const basicAuth = this.loginService.useBasicAuth(this.model);
      const hasPermission = await this.loginService.login(basicAuth, this.model);
      if (!hasPermission) {
        this.onChangeView.emit({ view: LoginViews.MissingApplicationAccess });
      }
    } catch (e) {
      if (e.res && e.res.headers && e.res.headers.get(this.PASSWORD_RESET_HEADER_NAME)) {
        this.handlePasswordReset(e.res);
      } else if (e.res && e.res.status === 401 && /pin.*generated/i.test(e.data.message)) {
        this.handleSmsChallenge(e.data.message);
      } else if (e.res && e.res.status === 401 && /TOTP/i.test(e.data.message)) {
        this.handleTotpChallenge(e.data.message);
      } else if (
        e.res &&
        e.res.headers &&
        e.res.headers.get(this.NO_PHONE_HEADER_NAME) &&
        !this.loginService.isSupportUser(this.model)
      ) {
        this.handleNoPhoneNumberProvided();
      } else {
        this.loginService.generateOauthToken(this.model);
        this.loginService.reset();
        this.alert.addServerFailure(e);
      }
    } finally {
      this.isLoading = false;
    }
  }

  private handlePasswordReset(e: any) {
    this.alert.removeLastDanger();
    this.model.token = e.headers.get(this.PASSWORD_RESET_HEADER_NAME);
    this.onChangeView.emit({ view: LoginViews.ChangePassword, credentials: this.model });
  }

  private handleTotpChallenge(message) {
    if (/TOTP setup required/i.test(message)) {
      this.onChangeView.emit({ view: LoginViews.TotpSetup, credentials: this.model });
    } else {
      this.onChangeView.emit({ view: LoginViews.TotpChallenge, credentials: this.model });
    }
  }

  private handleSmsChallenge(message: string) {
    if (/pin has already been generated/i.test(message)) {
      this.alert.warning(
        gettext(
          'The verification code was already sent. For a new verification code, please click on the link above.'
        )
      );
    }
    this.alert.removeLastDanger();
    this.onChangeView.emit({ view: LoginViews.SmsChallenge, credentials: this.model });
  }

  private handleNoPhoneNumberProvided() {
    this.onChangeView.emit({ view: LoginViews.ProvidePhoneNumber, credentials: this.model });
    this.alert.warning(
      gettext(
        'Two-factor authentication has been turned on for this account. Provide your phone number above to save it in your user profile and start receiving verification codes via SMS.'
      )
    );
  }
}
