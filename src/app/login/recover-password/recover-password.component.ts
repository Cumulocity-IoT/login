import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { UserService } from '@c8y/client';
import { LoginService } from '../login.service';
import { LoginEvent, LoginViews } from '../login.model';
import { FormsModule } from '@angular/forms';
import {
  C8yTranslateDirective,
  FormGroupComponent,
  RequiredInputPlaceholderDirective,
  C8yTranslatePipe,
  AlertService
} from '@c8y/ngx-components';
import { gettext } from '@c8y/ngx-components/gettext';

@Component({
  selector: 'c8y-recover-password',
  templateUrl: './recover-password.component.html',
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
export class RecoverPasswordComponent implements OnInit {
  @Input() recoverPasswordData: LoginEvent['recoverPasswordData'];
  @Output() onChangeView = new EventEmitter<LoginEvent>();
  LOGIN_VIEWS = LoginViews;
  isLoading = false;
  model = {
    email: '',
    tenantId: ''
  };

  constructor(
    private users: UserService,
    public loginService: LoginService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    if (this.recoverPasswordData) {
      this.model.email = this.recoverPasswordData.email || '';
      this.model.tenantId = this.recoverPasswordData.tenantId || '';

      const message =
        this.recoverPasswordData.tokenStatus === 'expired'
          ? gettext('This password reset link expired. To continue, request a new one.')
          : this.recoverPasswordData.tokenStatus === 'invalid'
            ? gettext('This password reset link is invalid. To continue, request a new one.')
            : '';
      if (message) {
        this.alertService.danger(message);
      }
    } else {
      this.model.tenantId = this.loginService.getTenant();
    }
  }

  async resetPassword() {
    try {
      this.isLoading = true;
      const { res } = await this.users.sendPasswordResetMail(this.model.email, this.model.tenantId);
      if (res.status === 200) {
        this.loginService.addSuccessMessage('password_reset_requested');
      }
    } finally {
      this.loginService.reset();
      this.isLoading = false;
    }
  }
}
