import {
  Component,
  Input,
  OnInit,
  HostListener,
  OnDestroy,
  ViewEncapsulation
} from '@angular/core';
import { ICredentials, TenantLoginOptionType } from '@c8y/client';
import { LoginService } from './login.service';
import {
  OptionsService,
  AlertService,
  AppStateService,
  AlertOutletComponent,
  C8yTranslateDirective,
  C8yTranslatePipe
} from '@c8y/ngx-components';
import { gettext } from '@c8y/ngx-components/gettext';
import { LoginEvent, LoginViews, SsoData, SsoError } from './login.model';
import { CredentialsFromQueryParamsService } from './credentials-from-query-params.service';
import { CredentialsComponentParams } from './credentials-component-params';
import { NgIf, NgSwitch, NgSwitchCase, NgFor, AsyncPipe } from '@angular/common';
import { CredentialsComponent } from './credentials/credentials.component';
import { RecoverPasswordComponent } from './recover-password/recover-password.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { TotpAuthComponent } from './totp-auth/totp-auth.component';
import { TenantIdSetupComponent } from './tenant-id-setup/tenant-id-setup.component';
import { ProvidePhoneNumberComponent } from './provide-phone-number/provide-phone-number.component';
import { SmsChallengeComponent } from './sms-challenge/sms-challenge.component';
import { MissingApplicationAccessComponent } from './missing-application-access/missing-application-access.component';

@Component({
  selector: 'c8y-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgIf,
    NgSwitch,
    NgSwitchCase,
    CredentialsComponent,
    RecoverPasswordComponent,
    ChangePasswordComponent,
    TotpAuthComponent,
    SmsChallengeComponent,
    ProvidePhoneNumberComponent,
    TenantIdSetupComponent,
    NgFor,
    AlertOutletComponent,
    AsyncPipe,
    MissingApplicationAccessComponent,
    C8yTranslateDirective,
    C8yTranslatePipe
  ]
})
export class LoginComponent implements OnInit, OnDestroy {
  currentView: LoginViews = LoginViews.None;
  LOGIN_VIEWS = LoginViews;
  platformAnimationSrc: string | false = false;
  isBrandLogoSet = false;

  disabled = false;

  @Input() name: string;

  credentials: ICredentials = {};
  loginViewParams: CredentialsComponentParams | { [key: string]: any } = {};
  displayAlerts = false;
  private TOKEN_PARAM = 'token';

  /**
   * Just DI.
   */
  constructor(
    public loginService: LoginService,
    private options: OptionsService,
    private alert: AlertService,
    private credentialsFromQueryParamsService: CredentialsFromQueryParamsService,
    public ui: AppStateService
  ) {
    this.isBrandLogoSet = !!this.getValueForCSSVariable('--brand-logo-img');
    this.platformAnimationSrc = this.getPlatformAnimationPath();
  }

  ngOnInit() {
    const token = this.getParamAndClear(this.TOKEN_PARAM);
    const ssoData = this.getSsoData();
    if (ssoData) {
      this.handleSso(ssoData);
    } else if (this.loginService.isFirstLogin) {
      if (!token) {
        this.loginAutomatically();
      } else {
        this.credentials.token = token;
        this.reset(false);
      }
    }
    this.loginService.isFirstLogin = false;
  }

  ngOnDestroy(): void {
    // make sure that we do not have any queryParameters related to credentials after logging in or even if we were already logged in.
    this.credentialsFromQueryParamsService.removeCredentialsFromQueryParams();
  }

  handleLoginTemplate(event: LoginEvent) {
    this.currentView = event.view;
    this.credentials = event.credentials || {};
    this.loginViewParams = event.loginViewParams || {};
  }

  @HostListener('keyup', ['$event']) onkeyup(event: KeyboardEvent) {
    if (event.key !== 'Enter') {
      this.loginService.cleanMessages();
    }
  }

  reset(missingPermissions: boolean) {
    if (missingPermissions) {
      this.handleLoginTemplate({ view: LoginViews.MissingApplicationAccess });
      return;
    }
    this.loginService.reset();
    this.setView();
    this.loginService.cleanMessages();
  }

  private getPlatformAnimationPath() {
    const defaultPath = './platform-animation.svg';

    const platformAnimationImagePath = this.getValueForCSSVariable(
      '--login-platform-animation-img'
    );
    if (platformAnimationImagePath) {
      return platformAnimationImagePath;
    }

    // in case we have a brand logo image, we don't want to show the platform animation
    if (this.isBrandLogoSet) {
      return false;
    }

    return defaultPath;
  }

  private getValueForCSSVariable(variableName: string): string {
    const rootStyles = getComputedStyle(document.body);

    // getPropertyValue might not be available in e.g. unit tests
    if (rootStyles && typeof rootStyles.getPropertyValue === 'function') {
      const brandLogo = rootStyles?.getPropertyValue(variableName).trim();
      return brandLogo;
    }
    return '';
  }

  private async loginAutomatically() {
    this.loginService.automaticLoginInProgress$.next(true);
    try {
      const result = await this.loginService.login();
      if (result) {
        return;
      }
      this.reset(true);
    } catch (e) {
      await this.loginService.clearCookies();
      const preferredLoginOptionType = this.loginService.loginMode.type;
      if (preferredLoginOptionType === TenantLoginOptionType.OAUTH2 && e.res?.status !== 403) {
        this.loginService.redirectToOauth();
      } else {
        this.reset(false);
        if (
          preferredLoginOptionType === TenantLoginOptionType.OAUTH2_INTERNAL &&
          window.location.protocol !== 'https:'
        ) {
          this.alert.danger(gettext('Current login mode only supports HTTPS.'));
        } else if (e.res && e.res.status === 403) {
          this.alert.addServerFailure(e);
        }
      }
    }
    this.loginService.automaticLoginInProgress$.next(false);
  }

  private setView() {
    if (this.credentials && this.credentials.token) {
      this.handleLoginTemplate({ view: LoginViews.ChangePassword, credentials: this.credentials });
    } else if (this.loginService.showTenantSetup()) {
      this.handleLoginTemplate({ view: LoginViews.TenantIdSetup });
    } else {
      this.handleLoginTemplate({ view: LoginViews.Credentials });
    }
  }

  private getParamAndClear(paramName: string): string | undefined {
    const paramValue = this.options.get<string>(paramName);
    if (paramValue) {
      this.options.set(paramName, undefined); // only use once
    }
    return paramValue;
  }

  private getSsoData(): SsoData | SsoError | false {
    const code = this.getParamAndClear('code');
    const sessionState = this.getParamAndClear('session_state');
    if (code) {
      return { sessionState, code };
    }

    const ssoError = this.getParamAndClear('error');
    const ssoErrorDescription = this.getParamAndClear('error_description');
    if (ssoError && ssoErrorDescription) {
      return { ssoError, ssoErrorDescription };
    }
    return false;
  }

  private handleSso(ssoData: SsoData | SsoError) {
    if ('ssoError' in ssoData) {
      this.loginService.showSsoError(
        decodeURIComponent(ssoData.ssoErrorDescription).replace(/\+/g, '%20')
      );
      this.reset(false);
    } else {
      this.loginService
        .loginBySso(ssoData)
        .then(() => this.loginService.login())
        .catch(e => {
          this.reset(false);
          if (e.res?.status) {
            this.alert.addServerFailure(e);
          }
        });
    }
  }
}
