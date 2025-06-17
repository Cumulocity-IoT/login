import { Injectable } from '@angular/core';
import { PasswordService } from '@c8y/ngx-components';
import { PasswordStrength } from '@c8y/client';

@Injectable({
  providedIn: 'root'
})
export class StrengthValidatorService {
  constructor(private passwordService: PasswordService) {}

  isStrong(password: string): boolean {
    return this.isPasswordGreen(this.passwordService.getStrengthColor(password).passwordStrength);
  }

  private isPasswordGreen(strength: PasswordStrength) {
    return (strength as PasswordStrength) === (PasswordStrength.GREEN as PasswordStrength);
  }
}
