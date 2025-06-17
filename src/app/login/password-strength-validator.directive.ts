import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { StrengthValidatorService } from './strength-validator-service';

@Directive({
  selector: '[passwordStrengthEnforced]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: PasswordStrengthValidatorDirective, multi: true }
  ],
  standalone: true
})
export class PasswordStrengthValidatorDirective implements Validator {
  private forced: boolean;

  @Input() set passwordStrengthEnforced(value) {
    this.forced = value;
  }

  constructor(public passwordService: StrengthValidatorService) {}

  validate(control: AbstractControl): ValidationErrors | null {
    const strengthFulfilled = this.passwordService.isStrong(control.value || '');
    const enforcementForcedAndNotFulfilled = this.forced && !strengthFulfilled;
    return enforcementForcedAndNotFulfilled ? { passwordStrength: true } : null;
  }
}
