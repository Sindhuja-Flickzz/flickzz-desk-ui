import { Pipe, PipeTransform } from '@angular/core';

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  username: 'User Name',
  mailId: 'Email',
  otpCode: 'OTP Code',
  validationCode: 'Validation Code',
  accessId: 'Access ID',
  orgId: 'Organization ID',
  calendarId: 'Calendar',
  plantName: 'Plant Name',
  companyName: 'Company Name',
  skillName: 'Skill Name',
  experienceYears: 'Experience Years',
  experienceMonths: 'Experience Months'
};

@Pipe({
  name: 'fieldLabel'
})
export class FieldLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const normalized = value.trim();
    const override = FIELD_LABEL_OVERRIDES[normalized];
    if (override) {
      return override;
    }

    const spaced = normalized
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .replace(/([0-9]+)/g, ' $1 ')
      .replace(/\s+/g, ' ')
      .trim();

    return spaced
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
