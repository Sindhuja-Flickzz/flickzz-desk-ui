// src/app/shared/services/date-utils.service.ts
import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class DateUtilsService {
  formatToDDMMYYYY(date: Date): Date {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return new Date(+year, +month - 1, +day);
  }

  getCurrentDate(date: Date): Date {
    return new Date(date);
  }

   getNextDate(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
  }

  getNextYearDate(date: Date): Date {
    const nextYear = new Date(date);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    // If rollover happened (Feb 28 instead of Feb 29), push to March 1
    if (date.getDate() === 29 && date.getMonth() === 1 && nextYear.getDate() === 28) {
      nextYear.setDate(1);
      nextYear.setMonth(2); // March
    }
    return nextYear;
  }

  dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const regex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/;
    if (!regex.test(control.value)) {
      return { invalidDateFormat: { value: control.value } };
    }

    const [day, month, year] = control.value.split('.').map(Number);
    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return { invalidDate: { value: control.value } };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (control.parent && (control.parent.get('validFrom') === control || control.parent.get('validTo') === control)) {
      if (date < today) {
        return { pastDate: { value: control.value } };
      }
    }

    // Optional: ensure validTo >= validFrom
    const validFromCtrl = control.parent?.get('validFrom');
    const validToCtrl = control.parent?.get('validTo');
    if (validFromCtrl?.value && validToCtrl?.value) {
      const [d1, m1, y1] = validFromCtrl.value.split('.').map(Number);
      const [d2, m2, y2] = validToCtrl.value.split('.').map(Number);
      const fromDate = new Date(y1, m1 - 1, d1);
      const toDate = new Date(y2, m2 - 1, d2);
      if (toDate < fromDate) {
        return { invalidRange: true };
      }
    }

    return null;
  }


}
