import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { UserService } from '@c8y/client';
import { LoginService } from '../login.service';
import { LoginEvent, LoginViews } from '../login.model';
import { FormsModule } from '@angular/forms';
import {
  C8yTranslateDirective,
  FormGroupComponent,
  RequiredInputPlaceholderDirective,
  C8yTranslatePipe
} from '@c8y/ngx-components';

import { NgIf } from '@angular/common';

@Component({
  selector: 'c8y-recover-password',
  templateUrl: './recover-password.component.html',
  styles: [],
  standalone: true,
  imports: [
    FormsModule,
    C8yTranslateDirective,
    NgIf,
    FormGroupComponent,
    RequiredInputPlaceholderDirective,
    C8yTranslatePipe
  ]
})
export class RecoverPasswordComponent implements OnInit {
  @Output() onChangeView = new EventEmitter<LoginEvent>();
  LOGIN_VIEWS = LoginViews;
  isLoading = false;
  model = {
    email: '',
    tenantId: ''
  };

  constructor(
    private users: UserService,
    public loginService: LoginService
  ) {}

  ngOnInit() {
    this.model.tenantId = this.loginService.getTenant();
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
