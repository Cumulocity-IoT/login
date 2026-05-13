import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, NgModel, ValidatorFn } from '@angular/forms';
import { ICredentials, IResetPassword, PasswordStrength, UserService } from '@c8y/client';
import {
  AlertService,
  C8yTranslateDirective,
  C8yTranslatePipe,
  FormGroupComponent,
  MessageDirective,
  MessagesComponent,
  OptionsService,
  PasswordCheckListComponent,
  PasswordConfirm,
  PasswordStrengthService,
  PasswordValidationDirective,
  PasswordValidationService,
  RequiredInputPlaceholderDirective
} from '@c8y/ngx-components';
import { LoginEvent, LoginViews } from '../login.model';
import { LoginService } from '../login.service';

@Component({
  selector: 'c8y-change-password',
  templateUrl: './change-password.component.html',
  styles: [],
  standalone: true,
  imports: [
    FormsModule,
    C8yTranslateDirective,
    FormGroupComponent,
    RequiredInputPlaceholderDirective,
    PasswordValidationDirective,
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

  isLoading = false;
  requirementsFulfilled = false;
  model = {
    tenantId: '',
    email: '',
    newPassword: '',
    newPasswordConfirm: ''
  };
  emailReadOnly = false;
  passwordStrengthEnforced = false;

  private readonly DEFAULT_MIN_LENGTH = 8;
  private minLength: number;
  private TOKEN_PARAM = 'token';
  private EMAIL_PARAM = 'email';

  get effectiveMinLength(): number {
    return this.passwordStrengthEnforced
      ? this.minLength || this.DEFAULT_MIN_LENGTH
      : this.DEFAULT_MIN_LENGTH;
  }

  newPasswordModel: NgModel;

  @ViewChild('newPassword')
  set _newPasswordModel(ngModel: NgModel) {
    if (ngModel) {
      this.newPasswordModel = ngModel;
      ngModel.control.addValidators(this.passwordChecklistValidator);
    }
  }

  constructor(
    public loginService: LoginService,
    private passwordStrength: PasswordStrengthService,
    private users: UserService,
    private options: OptionsService,
    private alert: AlertService,
    private passwordValidation: PasswordValidationService
  ) {}

  // Keep form invalid when strength is enforced and checklist requirements aren't met.
  passwordChecklistValidator: ValidatorFn = control =>
    !this.passwordStrengthEnforced || this.requirementsFulfilled || !control.value
      ? null
      : { passwordStrengthChecklist: true };

  async ngOnInit() {
    this.model.tenantId = this.loginService.getTenant();
    this.model.email = this.options.get(this.EMAIL_PARAM, '');
    this.emailReadOnly = !!this.model.email;

    const [passwordStrengthEnforced, greenMinLength] = await Promise.all([
      this.passwordStrength.getPasswordStrengthEnforced(),
      this.passwordStrength.getGreenMinLength()
    ]);

    this.passwordStrengthEnforced = passwordStrengthEnforced;
    this.minLength = greenMinLength;
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

  updateValidity(requirementsFulfilled: boolean) {
    this.requirementsFulfilled = requirementsFulfilled;

    if (!this.newPasswordModel) {
      return;
    }

    this.newPasswordModel.control.updateValueAndValidity();

    const errors = this.newPasswordModel.control.errors;
    if (!errors || !this.passwordStrengthEnforced) {
      return;
    }

    const password = this.model.newPassword || '';
    const hasInvalidChars = password && !this.passwordValidation.hasValidCharsOnly(password);

    const filteredErrors = { ...errors };
    if (!this.requirementsFulfilled && !hasInvalidChars) {
      // Checklist not fulfilled AND no invalid chars → show checklist error, hide pattern errors
      delete filteredErrors['password'];
      delete filteredErrors['passwordSimple'];
    } else if (filteredErrors['password'] || filteredErrors['passwordSimple']) {
      // Pattern error (invalid chars or checklist fulfilled) → show pattern error, hide checklist
      delete filteredErrors['passwordStrengthChecklist'];
    }

    const remaining = Object.keys(filteredErrors).length ? filteredErrors : null;
    this.newPasswordModel.control.setErrors(remaining);
  }
}
