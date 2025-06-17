import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { LoginService } from '../login.service';
import { IResetPassword, ICredentials, UserService, PasswordStrength } from '@c8y/client';
import { LoginEvent, LoginViews } from '../login.model';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { PasswordStrengthValidatorDirective } from '../password-strength-validator.directive';
import {
  C8yTranslatePipe,
  PasswordCheckListComponent,
  PasswordConfirm,
  MessageDirective,
  MessagesComponent,
  RequiredInputPlaceholderDirective,
  FormGroupComponent,
  C8yTranslateDirective,
  AlertService,
  OptionsService
} from '@c8y/ngx-components';
import { PasswordStrengthService } from '@c8y/ngx-components';

@Component({
  selector: 'c8y-change-password',
  templateUrl: './change-password.component.html',
  styles: [],
  standalone: true,
  imports: [
    FormsModule,
    C8yTranslateDirective,
    NgIf,
    FormGroupComponent,
    RequiredInputPlaceholderDirective,
    PasswordStrengthValidatorDirective,
    MessagesComponent,
    MessageDirective,
    PasswordConfirm,
    PasswordCheckListComponent,
    C8yTranslatePipe
  ]
})
export class ChangePasswordComponent implements OnInit {
  @Input() credentials: ICredentials;
  @Output() onChangeView = new EventEmitter<LoginEvent>();

  passwordPattern = /^[a-zA-Z0-9`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]{8,32}$/;
  isLoading = false;
  model = {
    tenantId: '',
    email: '',
    newPassword: '',
    newPasswordConfirm: ''
  };
  emailReadOnly = false;
  passwordStrengthEnforced = false;

  private TOKEN_PARAM = 'token';
  private EMAIL_PARAM = 'email';

  constructor(
    public loginService: LoginService,
    private passwordStrength: PasswordStrengthService,
    private users: UserService,
    private options: OptionsService,
    private alert: AlertService
  ) {}

  async ngOnInit() {
    this.model.tenantId = this.loginService.getTenant();
    this.model.email = this.options.get(this.EMAIL_PARAM, '');
    this.emailReadOnly = !!this.model.email;
    this.passwordStrengthEnforced = await this.passwordStrength.getPasswordStrengthEnforced();
  }

  async changePassword() {
    const resetPassword: IResetPassword = {
      token: this.credentials.token,
      email: this.model.email,
      newPassword: this.model.newPassword,
      passwordStrength: PasswordStrength.GREEN // @TODO: MTM-58234 - Deprecated - currently Backend requires this parameter.
    };
    try {
      this.isLoading = true;
      const { res } = await this.users.resetPassword(resetPassword, this.model.tenantId);
      if (res.status === 200) {
        this.loginService.addSuccessMessage('password_changed');
        this.credentials.token = undefined;
        this.options.set(this.TOKEN_PARAM, undefined);
        if (this.loginService.showTenantSetup()) {
          this.onChangeView.emit({ view: LoginViews.TenantIdSetup });
        } else {
          this.onChangeView.emit({ view: LoginViews.Credentials });
        }
      }
    } catch (e) {
      this.alert.addServerFailure(e);
    } finally {
      this.loginService.reset();
      this.isLoading = false;
    }
  }
}
