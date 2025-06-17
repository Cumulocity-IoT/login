import { Injectable } from '@angular/core';
import { ICredentials } from '@c8y/client';

@Injectable({ providedIn: 'root' })
export class CredentialsFromQueryParamsService {
  private readonly queryParamsToHandle: Array<keyof ICredentials> = ['tenant', 'user'];

  /**
   * Retrieves any subset of credentials provided via queryParams
   * @return ICredentials found in queryParams.
   */
  getCredentialsFromQueryParams(): ICredentials {
    const credentials: ICredentials = {};
    try {
      const params = new URLSearchParams(window.location.search);
      this.queryParamsToHandle.forEach(param => {
        const value = this.getParameterFromQueryParams(params, param);
        if (value) {
          credentials[param] = value;
        }
      });
    } catch (e) {
      // URLSearchParams probably not available in all browsers (https://caniuse.com/urlsearchparams)
    }
    return credentials;
  }

  /**
   * Removes credentials from the queryParameters if any are present.
   * In case some credentials were present, this method will cause a page reload.
   * @return boolean if credentials were found.
   */
  removeCredentialsFromQueryParams(): boolean {
    try {
      const params = new URLSearchParams(window.location.search);
      const hasRemovedAtLeastOneParam = this.queryParamsToHandle
        .map(param => this.removeParameterFromQueryParameters(params, param))
        .reduceRight((prev, curr) => prev || curr, false);
      if (hasRemovedAtLeastOneParam) {
        window.location.search = params.toString();
        return true;
      }
    } catch (e) {
      // URLSearchParams probably not available in all browsers (https://caniuse.com/urlsearchparams)
    }
    return false;
  }

  /**
   * Looks for the specified key in the provided URLSearchParams.
   * If the specified key was found, it will be removed.
   * @return boolean if key was found.
   */
  private removeParameterFromQueryParameters(
    params: URLSearchParams,
    key: keyof ICredentials
  ): boolean {
    const keyAsString = `${key}`;
    if (!params.has(keyAsString)) {
      return false;
    }
    params.delete(keyAsString);
    return true;
  }

  /**
   * Looks for the specified key in the provided URLSearchParams.
   * If the specified key was found, it's value will be returned.
   * Otherwise null will be returned.
   * @return string/null.
   */
  private getParameterFromQueryParams(
    params: URLSearchParams,
    key: keyof ICredentials
  ): string | null {
    const keyAsString = `${key}`;
    if (!params.has(keyAsString)) {
      return null;
    }
    const value = params.get(keyAsString);
    if (!value) {
      return null;
    }
    return value;
  }
}
