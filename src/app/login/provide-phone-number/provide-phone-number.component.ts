import { Component, Output, EventEmitter, Input } from '@angular/core';
import { LoginService } from '../login.service';
import { LoginEvent, LoginViews } from '../login.model';
import { ICredentials, UserService } from '@c8y/client';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import {
  RequiredInputPlaceholderDirective,
  PhoneValidationDirective,
  C8yTranslatePipe,
  FormGroupComponent,
  C8yTranslateDirective,
  AlertService
} from '@c8y/ngx-components';

@Component({
  selector: 'c8y-provide-phone-number',
  templateUrl: './provide-phone-number.component.html',
  standalone: true,
  imports: [
    FormsModule,
    C8yTranslateDirective,
    FormGroupComponent,
    NgClass,
    RequiredInputPlaceholderDirective,
    PhoneValidationDirective,
    C8yTranslatePipe
  ]
})
export class ProvidePhoneNumberComponent {
  @Input() credentials: ICredentials;
  @Output() onCancel = new EventEmitter();
  @Output() onChangeView = new EventEmitter<LoginEvent>();

  phoneNumber: string;
  requestInProgress = false;
  private readonly sendTfa: string = '0';

  constructor(
    public loginService: LoginService,
    public alert: AlertService,
    private userService: UserService
  ) {}

  async save() {
    try {
      this.requestInProgress = true;
      await this.userService.savePhoneNumber(this.phoneNumber);
      await this.sendTFASms();
      this.onChangeView.emit({
        view: LoginViews.SmsChallenge,
        credentials: this.credentials
      });
    } catch (e) {
      this.alert.addServerFailure(e);
    } finally {
      this.requestInProgress = false;
    }
  }

  private async sendTFASms() {
    try {
      await this.userService.verifyTFACode(this.sendTfa);
    } catch (e) {
      if (e.res.status === 403) {
        this.loginService.cleanMessages();
        this.loginService.addSuccessMessage('send_sms');
      } else {
        throw e;
      }
    }
  }
}
