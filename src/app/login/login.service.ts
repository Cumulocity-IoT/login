import { inject, Injectable } from '@angular/core';
import {
  ApplicationService,
  BearerAuthFromSessionStorage,
  FetchClient,
  IAuthentication,
  ICredentials,
  ICurrentTenant,
  IFetchResponse,
  ITenantLoginOption,
  TenantLoginOptionsService,
  TenantService,
  UserService,
  ICurrentUser,
  IUser
} from '@c8y/client';
import { TenantUiService, ModalService, Status, SimplifiedAuthService } from '@c8y/ngx-components';
import { gettext } from '@c8y/ngx-components/gettext';
import { ApiService } from '@c8y/ngx-components/api';
import { switchMap } from 'rxjs/operators';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { isEmpty } from 'lodash-es';
import { TranslateService } from '@ngx-translate/core';
import { LoginEvent, SsoData } from './login.model';
import {
  getStoredToken,
  getStoredTfaToken,
  TOKEN_KEY,
  TFATOKEN_KEY,
  isLocal
} from '@c8y/bootstrap';

/**
 * Service to manage the login.
 */
@Injectable({ providedIn: 'root' })
export class LoginService extends SimplifiedAuthService {
  rememberMe = false;
  loginMode: ITenantLoginOption;
  managementLoginMode: ITenantLoginOption;
  oauthOptions: ITenantLoginOption;
  isFirstLogin = true;
  automaticLoginInProgress$ = new BehaviorSubject(true);

  regexp = /\/apps\/(public\/)?([^\/]+)(\/.*)?$/;

  readonly queryParamsToRemove = [
    'token',
    'email',
    'code',
    'session_state',
    'error',
    'error_description'
  ] as const;

  private readonly IDP_HINT_QUERY_PARAM = 'idp_hint';
  private translateService = inject(TranslateService);
  ERROR_MESSAGES = {
    minlength: gettext('Password must have at least 8 characters and no more than 32.'),
    password_missmatch: gettext('Passwords do not match.'),
    maxlength: gettext('Password must have at least 8 characters and no more than 32.'),
    password_strength: gettext(
      'Your password is not strong enough. Please include numbers, lower and upper case characters'
    ),
    remote_error: gettext('Server error occurred.'),
    email: gettext('Invalid email address.'),
    password_change: gettext('Your password is expired. Please set a new password.'),
    password_reset_token_expired: gettext(
      'Password reset link expired. Please enter your email address to receive a new one.'
    ),
    tfa_pin_invalid: gettext('The code you entered is invalid. Please try again.'),
    pattern_newPassword: this.translateService.instant(
      gettext(
        'Password must have at least 8 characters and no more than 32 and can only contain letters, numbers and following symbols: {{ symbols }}'
      ),
      { symbols: '`~!@#$%^&*()_|+-=?;:\'",.<>{}[]\\/' }
    ),
    internationalPhoneNumber: gettext(
      'Must be a valid phone number (only digits, spaces, slashes ("/"), dashes ("-"), and plus ("+") allowed, for example: +49 9 876 543 210).'
    ),
    phone_number_error: gettext('Could not update phone number.'),
    pinAlreadySent: gettext(
      'The verification code was already sent. For a new verification code, please click on the link above.'
    ),
    passwordConfirm: gettext('Passwords do not match.'),
    tfaExpired: gettext('Two-factor authentication token expired.')
  };

  private SUCCESS_MESSAGES = {
    password_changed: gettext('Password changed. You can now log in using new password.'),
    password_reset_requested: gettext(
      'Password reset request has been sent. Please check your email.'
    ),
    resend_sms: gettext('Verification code SMS resent.'),
    send_sms: gettext('Verification code SMS sent.')
  };

  private showTenantRegExp = new RegExp('showTenant');

  private user = inject(UserService);
  private tenant = inject(TenantService);
  private api = inject(ApiService);
  private tenantUiService = inject(TenantUiService);
  private tenantLoginOptionsService = inject(TenantLoginOptionsService);
  private modalService = inject(ModalService);
  private applicationService = inject(ApplicationService);

  constructor() {
    super();
    this.autoLogout();
    this.initLoginOptions();
  }

  /**
   * Returns the current tenant.
   * @return The tenant name.
   */
  getTenant() {
    return this.client.tenant;
  }

  initLoginOptions() {
    const loginOptions = this.ui.state.loginOptions || [];
    this.loginMode = this.tenantUiService.getPreferredLoginOption(loginOptions);
    this.oauthOptions =
      this.tenantUiService.getOauth2Option(loginOptions) || ({} as ITenantLoginOption);
  }

  redirectToOauth() {
    const idpHint = this.getIdpHintFromQueryParams();
    const { initRequest, flowControlledByUI } = this.oauthOptions;
    const fullPath = `${window.location.origin}${window.location.pathname}`;
    const redirectUrl = encodeURIComponent(fullPath);
    const originUriParam = `${initRequest.includes('?') ? '&' : '?'}originUri=${redirectUrl}`;
    const urlObject = new URL(initRequest);

    if (flowControlledByUI) {
      this.client
        .fetch(`/tenant/oauth${urlObject.search}${originUriParam}`)
        .then(res => this.handleErrorStatusCodes(res))
        .then(res => res.json())
        .then((res: any) => (window.location.href = res.redirectTo))
        .catch(ex => this.showSsoError(ex));
    } else if (idpHint) {
      window.location.href = `${initRequest}${originUriParam}&${this.IDP_HINT_QUERY_PARAM}=${idpHint}`;
    } else {
      window.location.href = `${initRequest}${originUriParam}`;
    }
  }

  loginBySso({ code, sessionState }: SsoData) {
    const params = {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml'
      }
    };
    let url = `/tenant/oauth?code=${encodeURIComponent(code)}`;
    if (sessionState) {
      url += `&session_state=${encodeURIComponent(sessionState)}`;
    }

    return this.client
      .fetch(url, params)
      .then(res => this.handleErrorStatusCodes(res))
      .catch(ex => {
        this.showSsoError(ex);
        throw new Error();
      });
  }

  autoLogout() {
    const errorPattern = /invalid\scredentials.*pin.*generate/i;
    const isTfaExpired = data =>
      data && typeof data.message === 'string' && errorPattern.test(data.message);
    this.ui.currentUser
      .pipe(
        switchMap(u =>
          u ? this.api.hookResponse(({ response }) => response.status === 401) : EMPTY
        )
      )
      .subscribe(async (apiCall: any) => {
        const { response } = apiCall;
        let willLogout = false;
        if (isTfaExpired(response.data)) {
          willLogout = true;
        } else {
          if (typeof response.json === 'function') {
            const data = await response.clone().json();
            if (isTfaExpired(data)) {
              willLogout = true;
            }
          }
        }
        if (willLogout) {
          this.logout(false);
          setTimeout(() => this.alert.danger(this.ERROR_MESSAGES.tfaExpired), 500);
        }
      });
  }

  /**
   * Clears all backend errors.
   */
  cleanMessages() {
    this.alert.clearAll();
  }

  /**
   * Adds a new success message
   * @param successKey The key of the success message as used in SUCCESS_MESSAGES
   */
  addSuccessMessage(successKey: string) {
    const successMessage = this.SUCCESS_MESSAGES[successKey];
    if (successMessage) {
      this.alert.add({
        text: successMessage,
        type: 'success',
        timeout: 0
      });
    }
  }

  /**
   * Returns the current strategy. Defaults to cookie, if a token
   * is found in local or session storage we switch to basic auth.
   * @returns The current auth strategy.
   */
  getAuthStrategy(): IAuthentication {
    try {
      const authStrategy = new BearerAuthFromSessionStorage();
      console.log(`Using BearerAuthFromSessionStorage`);
      return authStrategy;
    } catch (e) {
      // do nothing
    }
    let authStrategy: IAuthentication = this.cookieAuth;
    const token = this.getStoredToken();
    const tfa = this.getStoredTfaToken();
    if (token) {
      authStrategy = this.basicAuth;
      this.setCredentials({ token, tfa }, this.basicAuth);
    }
    return authStrategy;
  }

  /**
   * Forces the use of basic auth as strategy with this credentials.
   * @param credentials The credentials to use.
   */
  useBasicAuth(credentials: ICredentials) {
    this.setCredentials(credentials, this.basicAuth);
    return this.basicAuth;
  }

  /**
   * Tries to login a user with the given credentials.
   * If successful, the current tenant and user is set. If not an error
   * is thrown. It also verifies if the user is allowed to open the
   * current app.
   * @param auth The authentication strategy used.
   * @param credentials The credentials to try to login.
   */
  async login(
    auth: IAuthentication = this.getAuthStrategy(),
    credentials?: ICredentials
  ): Promise<boolean> {
    // To ensure backward compatibility, we need to verify whether the backend supports TFA
    // without requiring the use of /tenant with auth: base64. The tfaSupported flag indicates
    // whether authentication is possible exclusively via OAI-SECURE.
    // TfaSupported flag should be removed during: MTM-62641
    const isOAISecureAndTFAIsSupported =
      (this.tenantUiService.isOauthInternal(this.loginMode) && this.loginMode.tfaSupported) ||
      false;

    if (isOAISecureAndTFAIsSupported && (await this.switchLoginMode(credentials))) {
      auth = this.cookieAuth;
    } else {
      this.client.setAuth(auth);
    }

    const tenantRes = await this.tenant.current({ withParent: true });
    const tenant = tenantRes.data;

    if (credentials) {
      credentials.tenant = tenant.name;
    }

    if (!isOAISecureAndTFAIsSupported && (await this.switchLoginMode(credentials))) {
      auth = this.cookieAuth;
    }

    let user: ICurrentUser | IUser;
    try {
      const { data } = await this.user.current();
      user = data;
    } catch (e) {
      if (e.res?.status === 403) {
        const { data } = await this.user.currentWithEffectiveRoles();
        user = data;
      } else {
        throw e;
      }
    }

    const supportUserName = this.getSupportUserName(credentials);
    const token = this.setCredentials(
      {
        tenant: tenant.name,
        user: (supportUserName ? `${supportUserName}$` : '') + user.userName
      },
      auth
    );

    if (token) {
      this.storeBasicAuthToken(token);
    }

    await this.authFulfilled(tenant, user);

    return this.ensureUserPermissionsForRedirect(user);
  }

  async ensureUserPermissionsForRedirect(user: IUser | ICurrentUser) {
    const redirectPath = await this.getRedirectPath();
    if (!redirectPath) {
      return false;
    }
    const userHasAccessToApp =
      // in case of local development we do not need to verify if the user has access to the app
      // This way developers do not need to create the application in the tenant before developing
      window.location.hostname === 'localhost' ||
      (await this.userHasAccessToApp(user, redirectPath));

    if (!userHasAccessToApp) {
      return false;
    }

    window.location.href = redirectPath;
    return true;
  }

  async getRedirectPath() {
    let redirectPathFromSessionStorage = sessionStorage.getItem('c8yRedirectAfterLoginPath');
    if (redirectPathFromSessionStorage) {
      sessionStorage.removeItem('c8yRedirectAfterLoginPath');
      if (redirectPathFromSessionStorage.includes('?')) {
        const { hash, searchParams, pathname } = new URL(
          redirectPathFromSessionStorage,
          window.location.origin
        );
        for (const param of this.queryParamsToRemove) {
          searchParams.delete(param);
        }
        const newQueryParams = searchParams.toString();

        const queryParamsToAppend = newQueryParams ? `?${newQueryParams}` : '';
        const hashToAppend = hash || '';
        redirectPathFromSessionStorage = pathname + queryParamsToAppend + hashToAppend;
      }
      return Promise.resolve(redirectPathFromSessionStorage);
    }
    return this.getDefaultAppRedirect();
  }

  async getDefaultAppRedirect() {
    const response = await fetch('/');
    const matches = response.url.match(this.regexp);
    return matches ? matches[0] : null;
  }

  async userHasAccessToApp(
    user: IUser | ICurrentUser,
    redirectPath: string
  ): Promise<false | string> {
    if (!redirectPath) {
      return false;
    }
    const contextPathOfApp = this.extractContextPathFromRedirectUrl(redirectPath);

    if (!contextPathOfApp) {
      return false;
    }

    try {
      await this.applicationService.getManifestOfContextPath(contextPathOfApp);
      return redirectPath;
    } catch (e) {
      return false;
    }
  }

  extractContextPathFromRedirectUrl(redirectUrl: string): string | null {
    const matches = redirectUrl.match(this.regexp);
    if (matches) {
      return matches[2];
    }
    return null;
  }

  /**
   * Saves tenant, user and support user info to the app state.
   * @param tenant The current tenant object.
   * @param user The current user object.
   * @param supportUserName The current support user name.
   */
  async authFulfilled(tenant?: ICurrentTenant, user?: ICurrentUser | IUser) {
    if (!tenant) {
      const { data } = await this.tenant.current({ withParent: true });
      tenant = data;
      this.client.tenant = tenant.name;
    }

    if (!user) {
      try {
        const { data } = await this.user.current();
        user = data;
      } catch (e) {
        if (e.res?.status === 403) {
          const { data } = await this.user.currentWithEffectiveRoles();
          user = data;
        } else {
          throw e;
        }
      }
    }

    this.ui.setUser({ user });
    this.ui.currentTenant.next(tenant);
  }

  /**
   * Switch the login mode to CookieAuth if the
   * user has configured to use it in loginOptions.
   * @param credentials The credentials for that login
   */
  async switchLoginMode(credentials?: ICredentials) {
    const isPasswordGrantLogin = await this.isPasswordGrantLogin(credentials);
    if (isPasswordGrantLogin && credentials) {
      const res = await this.generateOauthToken(credentials);
      if (!res?.ok) {
        try {
          const data = await res.json();
          throw { res, data };
        } catch (ex) {
          throw ex;
        }
      }
      this.client.setAuth(this.cookieAuth);
      this.cleanLocalStorage();
      this.basicAuth.logout();
    }
    return isPasswordGrantLogin;
  }

  async generateOauthToken(credentials?: ICredentials): Promise<IFetchResponse | null> {
    if ((await this.isPasswordGrantLogin(credentials)) && credentials) {
      const params = new URLSearchParams({
        grant_type: 'PASSWORD',
        username: credentials.user,
        password: credentials.password,
        ...(credentials.tfa !== undefined && { tfa_code: credentials.tfa })
      });
      return await new FetchClient().fetch(this.getUrlForOauth(credentials), {
        method: 'POST',
        body: params.toString(),
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
      });
    }

    return null;
  }

  async isPasswordGrantLogin(credentials?: ICredentials) {
    let loginMode = this.loginMode;

    if (this.isSupportUser(credentials)) {
      if (!this.managementLoginMode) {
        this.managementLoginMode = await this.getManagementLoginMode();
      }
      loginMode = this.managementLoginMode;
    }

    return this.tenantUiService.isOauthInternal(loginMode);
  }

  /**
   * Verifies if the provided credentials use a support user to log in or not.
   * @param credentials Credentials to check.
   * @returns {boolean} Returns true if user is a support user.
   */
  isSupportUser(credentials?: ICredentials): boolean {
    return credentials && credentials.user.includes('$');
  }

  /**
   * Verifies if the tenant input field should be shown
   * or not.
   * @returns If true, show the tenant input.
   */
  showTenant(): boolean {
    return !this.ui.state.loginOptions || this.isLocal() || this.isShowTenant();
  }

  /**
   * Verifies if the tenant setup should be shown
   * or not.
   * @returns If true, show the tenant input.
   */
  showTenantSetup(): boolean {
    return !this.ui.state.loginOptions && !this.isLocal();
  }

  /**
   * Saves the TFA token to local or session storage.
   * @param tfaToken The tfa token to save.
   * @param storage The storage to use (local or session).
   */
  saveTFAToken(tfaToken: string, storage: Storage) {
    storage.setItem(TFATOKEN_KEY, tfaToken);
  }

  redirectToDomain(domain) {
    const originUrl = new URL(window.location.href);
    const redirectUrl = originUrl.href.replace(originUrl.hostname, domain);
    window.location.href = redirectUrl;
  }

  showSsoError(error): void {
    const body = error
      ? this.translateService.instant(
          gettext(
            '<p><strong>The following error was returned from the external authentication service:</strong></p><p><code>{{ error }}</code></p>.'
          ),
          { error }
        )
      : gettext('SSO login failed. Contact the administrator.');

    this.modalService.acknowledge(gettext('Login error'), body, Status.DANGER, gettext('OK'));
  }

  async clearCookies() {
    // clear cookies but avoid redirect on logout
    return await this.cookieAuth.logout({ redirect: 'manual' });
  }

  /**
   * Validates the reset password token.
   * @param token The reset password token to validate.
   * @param email The email address associated with the token.
   * @returns  Returns 'valid', 'invalid', or 'expired' based on the token status.
   */
  async validateResetToken(
    token: string,
    email: string
  ): Promise<LoginEvent['recoverPasswordData']['tokenStatus']> {
    try {
      await this.user.validateResetToken(token, email);
      return 'valid';
    } catch (e) {
      if (e.res?.status === 422) {
        return 'expired';
      } else {
        return 'invalid';
      }
    }
  }

  /**
   * Sets the tenant to the client and updates the credentials on the
   * auth strategy.
   * @param credentials The name of the tenant.
   * @param authStrategy The authentication strategy used.
   * @return Returns the token if basic auth, otherwise undefined.
   */
  private setCredentials(credentials: ICredentials, authStrategy: IAuthentication) {
    if (credentials.tenant) {
      this.client.tenant = credentials.tenant;
    }
    // Check if a token is already set (case for support user login)
    // if yes -> we just need to update the user, and reuse the token
    // of the support user.
    // Therefore we need to pass user and tenant, to get
    // just the stored token and nothing else (see BasicAuth.ts:31).
    const token = this.basicAuth.updateCredentials({
      tenant: credentials.tenant,
      user: credentials.user
    });
    const newCredentials = { token, ...credentials };

    return authStrategy.updateCredentials(newCredentials);
  }

  /**
   * Verifies if the current user is a developer or not.
   * Running on localhost means development mode.
   */
  private isLocal(): boolean {
    return isLocal();
  }

  /**
   * Save the token to local or session storage.
   * @param token The token to save.
   * @param storage The storage to use (local or session).
   */
  private saveToken(token: string, storage: Storage) {
    storage.setItem(TOKEN_KEY, token);
  }

  private storeBasicAuthToken(token: string) {
    this.saveToken(token, sessionStorage);
    if (this.rememberMe) {
      this.saveToken(token, localStorage);
    }
  }

  private isShowTenant(): boolean {
    return this.showTenantRegExp.test(window.location.href);
  }

  /**
   * Gets support user name from credentials.
   * @param credentials Credentials object (defaults to the stored one).
   * @returns Support user name.
   */
  private getSupportUserName(credentials: ICredentials = this.getStoredCredentials()): string {
    if (!credentials) {
      return null;
    }
    const supportUserName = credentials.user.match(/^(.+\/)?((.+)\$)?(.+)?$/)[3];
    return supportUserName;
  }

  /**
   * Gets credentials object from the stored token.
   * @returns Credentials object.
   */
  private getStoredCredentials(): ICredentials {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }
    return this.decodeToken(token);
  }

  /**
   * Gets stored token from local storage or session storage.
   * @returns Stored token.
   */
  private getStoredToken(): string {
    return getStoredToken();
  }

  /**
   * Gets stored TFA token from local storage or session storage.
   * @returns Stored TFA token.
   */
  private getStoredTfaToken(): string {
    return getStoredTfaToken();
  }

  /**
   * Decodes token to credentials object.
   * @param token Token to decode.
   * @returns Credentials object.
   */
  private decodeToken(token: string): ICredentials {
    const decoded = decodeURIComponent(escape(window.atob(token)));
    const split = decoded.match(/(([^/]*)\/)?([^/:]+):(.+)/);

    return {
      tenant: split[2],
      user: split[3],
      password: split[4]
    };
  }

  private getUrlForOauth(credentials: ICredentials) {
    if (isEmpty(credentials.tenant) && this.loginMode.initRequest) {
      const urlParams = new URLSearchParams(this.loginMode.initRequest.split('?').pop());
      credentials.tenant = urlParams.get('tenant_id');
    }
    return !isEmpty(credentials.tenant)
      ? `tenant/oauth?tenant_id=${credentials.tenant}`
      : `tenant/oauth`;
  }

  private async getManagementLoginMode() {
    const managementLoginOptions = (await this.tenantLoginOptionsService.listForManagement()).data;
    return this.tenantUiService.getPreferredLoginOption(managementLoginOptions);
  }

  private async handleErrorStatusCodes(response: IFetchResponse): Promise<IFetchResponse> {
    if (response.status >= 400) {
      const data = await response.json();
      const error = data.message || data.error_description || data.error;
      throw error;
    }
    return response;
  }

  private getIdpHintFromQueryParams(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(this.IDP_HINT_QUERY_PARAM) || null;
  }
}
