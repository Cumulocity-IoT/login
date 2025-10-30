import { ICredentials } from '@c8y/client';
import { CredentialsComponentParams } from './credentials-component-params';

export interface LoginMessage {
  message: string;
  type: string;
}

export interface LoginEvent {
  view: LoginViews;
  credentials?: ICredentials;
  loginViewParams?: CredentialsComponentParams | { [key: string]: any };
  recoverPasswordData?: {
    email: string;
    tokenStatus: 'valid' | 'invalid' | 'expired';
    tenantId?: string;
  };
}

export enum LoginViews {
  None = 'NONE',
  Credentials = 'CREDENTIALS',
  RecoverPassword = 'RECOVER_PASSWORD',
  SmsChallenge = 'SMS_CHALLENGE',
  ChangePassword = 'CHANGE_PASSWORD',
  TotpChallenge = 'TOTP_CHALLENGE',
  TotpSetup = 'TOTP_SETUP',
  ProvidePhoneNumber = 'PROVIDE_PHONE_NUMBER',
  TenantIdSetup = 'TENANT_ID_SETUP',
  MissingApplicationAccess = 'MISSING_APPLICATION_ACCESS'
}

export type SsoData = {
  code: string;
  sessionState?: string;
};

export type SsoError = {
  ssoError: string;
  ssoErrorDescription: string;
};
