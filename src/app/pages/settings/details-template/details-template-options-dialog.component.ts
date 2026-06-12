import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DropdownOption, FieldType } from '../../../models/details-template.model';

export interface DetailsTemplateOptionsDialogData {
  options: DropdownOption[];
  fieldType: FieldType;
  fieldTypeLabel: string;
}

@Component({
  selector: 'app-details-template-options-dialog',
  templateUrl: './details-template-options-dialog.component.html',
  styleUrls: ['./details-template-options-dialog.component.scss']
})
export class DetailsTemplateOptionsDialogComponent implements OnInit {
  optionsForm: FormGroup;
  fieldType = FieldType;
  title: string;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DetailsTemplateOptionsDialogComponent, DropdownOption[]>,
    @Inject(MAT_DIALOG_DATA) public data: DetailsTemplateOptionsDialogData
  ) {
    this.title = `Configure ${this.data.fieldTypeLabel}`;
    this.optionsForm = this.fb.group({
      options: this.fb.array([])
    });
  }

  ngOnInit(): void {
    let options = this.data.options && this.data.options.length ? [...this.data.options] : [{ label: '', value: '', defaultSelected: false }];

    if (this.isCheckboxType()) {
      while (options.length < 2) {
        options.push({ label: '', value: '', defaultSelected: false });
      }
      if (options.length > 2) {
        options = options.slice(0, 2);
      }
      options = options.map((option) => ({
        label: option.label,
        value: option.label,
        defaultSelected: false
      }));
    }

    if (this.isDropdownType()) {
      options = options.map((option) => ({
        label: option.label,
        value: option.label,
        defaultSelected: false
      }));
    }

    if (!options.length) {
      options = [{ label: '', value: '', defaultSelected: false }];
    }

    options.forEach((option) => this.optionsControl.push(this.createOptionGroup(option)));
  }

  get optionsControl(): FormArray {
    return this.optionsForm.get('options') as FormArray;
  }

  createOptionGroup(option?: DropdownOption): FormGroup {
    const showValue = this.shouldShowValueColumn();
    const showDefault = this.shouldShowDefaultColumn();

    const group: { [key: string]: any } = {
      label: [option?.label || '', [Validators.required, this.trimValidator]]
    };

    if (showValue) {
      group['value'] = [option?.value || '', [Validators.required, this.trimValidator]];
    } else {
      group['value'] = [option?.value || option?.label || ''];
    }

    // Always keep defaultSelected control but do not require it when hidden
    group['defaultSelected'] = [option?.defaultSelected || false];

    return this.fb.group(group);
  }

  addOption(): void {
    if (this.isCheckboxType()) {
      return;
    }
    this.optionsControl.push(this.createOptionGroup());
  }

  removeOption(index: number): void {
    if (this.isCheckboxType() || this.optionsControl.length <= 1) {
      return;
    }
    this.optionsControl.removeAt(index);
  }

  toggleDefaultSelection(optionIndex: number): void {
    if (this.isSingleSelection()) {
      this.optionsControl.controls.forEach((control, index) => {
        (control as FormGroup).get('defaultSelected')?.setValue(index === optionIndex);
      });
      return;
    }

    const optionGroup = this.optionsControl.at(optionIndex) as FormGroup;
    const currentValue = optionGroup.get('defaultSelected')?.value;
    optionGroup.get('defaultSelected')?.setValue(!currentValue);
  }

  isSingleSelection(): boolean {
    return this.data.fieldType === FieldType.DROPDOWN;
  }

  isDropdownType(): boolean {
    return this.data.fieldType === FieldType.DROPDOWN;
  }

  isMultiSelectType(): boolean {
    return this.data.fieldType === FieldType.MULTISELECT;
  }

  isCheckboxType(): boolean {
    return this.data.fieldType === FieldType.CHECKBOX;
  }

  isRadioType(): boolean {
    return this.data.fieldType === FieldType.RADIO;
  }

  getOptionSideLabel(index: number): string {
    return index === 0 ? 'Left' : 'Right';
  }

  shouldShowValueColumn(): boolean {
    return this.isRadioType();
  }

  shouldShowDefaultColumn(): boolean {
    return this.isMultiSelectType();
  }

  save(): void {
    if (this.optionsForm.invalid) {
      console.log('this.optionForm', this.optionsForm, this.optionsForm.valid);
      this.optionsControl.controls.forEach((control) => control.markAllAsTouched());
      return;
    }

    this.optionsControl.controls.forEach((control) => {
      const group = control as FormGroup;
      const labelValue = group.get('label')?.value?.toString().trim() || '';

      if (this.isDropdownType() || this.isCheckboxType() || this.isMultiSelectType()) {
        group.get('value')?.setValue(labelValue);
      }

      if (this.isDropdownType() || this.isCheckboxType()) {
        group.get('defaultSelected')?.setValue(false);
      }
    });

    this.dialogRef.close(this.optionsControl.value as DropdownOption[]);
  }

  dropOption(event: CdkDragDrop<AbstractControl[]>): void {
    const options = this.optionsControl;
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const moved = options.at(event.previousIndex);
    options.removeAt(event.previousIndex);
    const insertIndex = event.previousIndex < event.currentIndex ? event.currentIndex - 1 : event.currentIndex;
    options.insert(insertIndex, moved);
    options.updateValueAndValidity();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  trimValidator(control: FormControl): { [key: string]: boolean } | null {
    if (control.value == null) {
      return null;
    }
    const trimmed = control.value.toString().trim();
    if (trimmed.length === 0) {
      return { trimmedEmpty: true };
    }
    return null;
  }
}
