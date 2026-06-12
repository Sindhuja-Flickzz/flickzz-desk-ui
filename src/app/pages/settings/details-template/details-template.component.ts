import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/confirmation-dialog/confirmation-dialog.component';
import { DetailsTemplateOptionsDialogComponent } from './details-template-options-dialog.component';
import { DetailsTemplateService } from '../../../service/details-template.service';
import { DetailsTemplateRequest, DropdownOption, FieldType, WorkItemType, WorkItem, FieldTypeItem, TemplatesDetails } from '../../../models/details-template.model';

@Component({
  selector: 'app-details-template',
  templateUrl: './details-template.component.html',
  styleUrls: ['./details-template.component.scss']
})
export class DetailsTemplateComponent implements OnInit, OnDestroy {
  templateForm: FormGroup;
  isSaving = false;
  isSubmitting = false;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Details Template';
  submitError = '';
  submitSuccess = '';
  formError: any = {};
  subscriptions: Subscription = new Subscription();

  workItemOptions: any[] = [];
  fieldTypeOptions: any[] = [];
  workItemMap: Map<string, WorkItem> = new Map();
  fieldTypeMap: Map<string, FieldTypeItem> = new Map();
  orgId = '';
  private dataLoadReady = false;
  private dataLoadPromise: Promise<void>;
  private dataLoadResolve?: () => void;

  templates: TemplatesDetails[] = [];
  isEditMode = false;
  editingTemplateId: number | null = null;
  templateListLoading = false;

  FieldType = FieldType;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private detailsTemplateService: DetailsTemplateService
  ) {
    this.orgId = localStorage.getItem('userOrgId') || '';
    this.dataLoadPromise = new Promise((resolve) => {
      this.dataLoadResolve = resolve;
    });
    this.templateForm = this.fb.group({
      templateName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), this.trimValidator]],
      workItem: ['', Validators.required],
      templateDetails: this.fb.array([this.createTemplateDetail()])
    });
  }

  ngOnInit(): void {
    this.loadWorkItemsAndFieldTypes();
    
    this.subscriptions.add(
      this.templateDetails.valueChanges.pipe(debounceTime(200)).subscribe(() => {
        this.validateRowDuplicates();
        this.validateOptionRows();
      })
    );

    window.addEventListener('beforeunload', this.beforeUnloadListener);
  }

  get createTabLabel(): string {
    return this.isEditMode ? 'Edit' : 'Create';
  }

  private loadWorkItemsAndFieldTypes(): void {
    if (!this.orgId) {
      this.dataLoadReady = true;
      this.dataLoadResolve?.();
      return;
    }

    this.subscriptions.add(
      forkJoin({
        workItems: this.detailsTemplateService.getWorkItemList(this.orgId),
        fieldTypes: this.detailsTemplateService.getFieldTypeList(this.orgId)
      }).subscribe({
        next: ({ workItems, fieldTypes }) => {
          const workItemsData = (workItems as any).attributes || (Array.isArray(workItems) ? workItems : []);
          this.workItemMap.clear();
          this.workItemOptions = Array.isArray(workItemsData)
            ? workItemsData.map((item: WorkItem) => {
                this.workItemMap.set(item.code, item);
                return {
                  label: item.label,
                  value: item.code
                };
              })
            : [];

          const fieldTypesData = (fieldTypes as any).attributes || (Array.isArray(fieldTypes) ? fieldTypes : []);
          this.fieldTypeMap.clear();
          this.fieldTypeOptions = Array.isArray(fieldTypesData)
            ? fieldTypesData.map((item: FieldTypeItem) => {
                this.fieldTypeMap.set(item.code, item);
                return {
                  label: item.label,
                  value: item.code
                };
              })
            : [];

          this.dataLoadReady = true;
          this.dataLoadResolve?.();
        },
        error: (err) => {
          console.error('Failed to load work items or field types', err);
          this.workItemOptions = [];
          this.fieldTypeOptions = [];
          this.dataLoadReady = true;
          this.dataLoadResolve?.();
        }
      })
    );
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadListener);
    this.subscriptions.unsubscribe();
  }

  get templateDetails(): FormArray {
    return this.templateForm.get('templateDetails') as FormArray;
  }

  get templateNameControl(): FormControl {
    return this.templateForm.get('templateName') as FormControl;
  }

  get rows(): FormGroup[] {
    return this.templateDetails.controls as FormGroup[];
  }

  createTemplateDetail(): FormGroup {
    return this.fb.group({
      fieldName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), this.trimValidator]],
      fieldType: ['', Validators.required],
      mandatory: [false],
      options: this.fb.array([])
    });
  }

  createOptionGroup(option?: DropdownOption): FormGroup {
    return this.fb.group({
      label: [option?.label || '', [Validators.required, this.trimValidator]],
      value: [option?.value || '', [Validators.required, this.trimValidator]],
      defaultSelected: [option?.defaultSelected || false]
    });
  }

  addRow(): void {
    this.templateDetails.push(this.createTemplateDetail());
    this.templateDetails.markAsDirty();
  }

  deleteRow(index: number): void {
    if (this.templateDetails.length === 1) {
      this.showSnack('At least one row is required.', true);
      return;
    }

    const dialogData: ConfirmationDialogData = {
      title: 'Delete row',
      message: 'Are you sure you want to remove this row from the template?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'delete'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.templateDetails.removeAt(index);
        this.templateDetails.markAsDirty();
        this.validateRowDuplicates();
      }
    });
  }

  openOptionsDialog(rowIndex: number): void {
    const row = this.templateDetails.at(rowIndex) as FormGroup;
    const fieldType = row.get('fieldType')?.value;
    if (!this.isOptionFieldType(fieldType)) {
      return;
    }

    const dialogRef = this.dialog.open(DetailsTemplateOptionsDialogComponent, {
      width: '60%',
      data: {
        options: row.get('options')?.value || [],
        fieldType,
        fieldTypeLabel: this.getFieldTypeLabel(row)
      }
    });

    dialogRef.afterClosed().subscribe((result: DropdownOption[] | undefined) => {
      if (!result) {
        return;
      }

      const optionsArray = this.fb.array(result.map((option) => this.createOptionGroup(option)));
      row.setControl('options', optionsArray);
      row.updateValueAndValidity();
      this.templateDetails.markAsDirty();
      this.validateOptionRows();
    });
  }

  onFieldTypeChange(index: number): void {
    const row = this.templateDetails.at(index) as FormGroup;
    const fieldType = row.get('fieldType')?.value;
    const optionsArray = this.getOptionsArray(row);

    if (this.isOptionFieldType(fieldType)) {
      if (optionsArray.length === 0) {
        optionsArray.push(this.createOptionGroup());
      }
    } else {
      row.setControl('options', this.fb.array([]));
    }

    row.updateValueAndValidity();
    this.validateOptionRows();
  }

  isOptionFieldType(fieldTypeCode: string): boolean {
    const fieldTypeItem = this.fieldTypeMap.get(fieldTypeCode);
    if (!fieldTypeItem) {
      return false;
    }
    return fieldTypeCode === 'DROPDOWN' || fieldTypeCode === 'MULTISELECT' || fieldTypeCode === 'CHECKBOX';
  }

  getRowOptions(index: number): DropdownOption[] {
    const row = this.templateDetails.at(index) as FormGroup;
    return row.get('options')?.value || [];
  }

  getOptionsArray(row: FormGroup): FormArray {
    return row.get('options') as FormArray;
  }

  addOption(rowIndex: number): void {
    const row = this.templateDetails.at(rowIndex) as FormGroup;
    this.getOptionsArray(row).push(this.createOptionGroup());
    row.updateValueAndValidity();
    this.templateDetails.markAsDirty();
  }

  removeOption(rowIndex: number, optionIndex: number): void {
    const row = this.templateDetails.at(rowIndex) as FormGroup;
    const optionsArray = this.getOptionsArray(row);
    if (optionsArray.length <= 1) {
      return;
    }
    optionsArray.removeAt(optionIndex);
    row.updateValueAndValidity();
    this.templateDetails.markAsDirty();
  }

  toggleDefaultSelection(rowIndex: number, optionIndex: number): void {
    const row = this.templateDetails.at(rowIndex) as FormGroup;
    const optionsArray = this.getOptionsArray(row);
    const fieldTypeCode = row.get('fieldType')?.value;
    const optionGroup = optionsArray.at(optionIndex) as FormGroup;
    const currentValue = optionGroup.get('defaultSelected')?.value;

    if (fieldTypeCode === 'DROPDOWN') {
      optionsArray.controls.forEach((control, index) => {
        (control as FormGroup).get('defaultSelected')?.setValue(index === optionIndex);
      });
    } else {
      optionGroup.get('defaultSelected')?.setValue(!currentValue);
    }

    row.updateValueAndValidity();
    this.templateDetails.markAsDirty();
  }

  getPreviewValues(index: number): string | string[] {
    const options = this.getRowOptions(index);
    const fieldTypeCode = (this.templateDetails.at(index) as FormGroup).get('fieldType')?.value;

    if (fieldTypeCode === 'MULTISELECT' || fieldTypeCode === 'CHECKBOX') {
      return options.filter((option) => option.defaultSelected).map((option) => option.value);
    }

    const selected = options.find((option) => option.defaultSelected);
    return selected?.value || '';
  }

  validateRowDuplicates(): void {
    const rows = this.templateDetails.controls as FormGroup[];
    const keyMap = new Map<string, FormControl[]>();

    rows.forEach((row) => {
      const fieldName = row.get('fieldName')?.value?.toString().trim().toLowerCase();
      const control = row.get('fieldName') as FormControl;

      if (fieldName) {
        const entries = keyMap.get(fieldName) || [];
        entries.push(control);
        keyMap.set(fieldName, entries);
      }
    });

    rows.forEach((row) => {
      const control = row.get('fieldName') as FormControl;
      const fieldName = row.get('fieldName')?.value?.toString().trim().toLowerCase();
      const duplicates = keyMap.get(fieldName) || [];
      this.setControlError(control, 'duplicateFieldName', duplicates.length > 1);
    });
  }

  validateOptionRows(): void {
    this.templateDetails.controls.forEach((rowControl) => {
      const row = rowControl as FormGroup;
      const fieldType = row.get('fieldType')?.value;
      const optionsArray = row.get('options') as FormArray;
      const requiresOptions = this.isOptionFieldType(fieldType);
      const hasOptions = optionsArray && optionsArray.length > 0;

      this.setControlError(row.get('options') as AbstractControl, 'requiredOptions', requiresOptions && !hasOptions);
    });
  }

  setControlError(control: AbstractControl, errorKey: string, hasError: boolean): void {
    const errors = control.errors ? { ...control.errors } : {};
    if (hasError) {
      errors[errorKey] = true;
    } else {
      delete errors[errorKey];
    }
    control.setErrors(Object.keys(errors).length ? errors : null);
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

  isSaveDisabled(): boolean {
    return this.isSaving || this.templateForm.invalid || this.templateDetails.length === 0;
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (this.templateNameControl.invalid) {
      if (this.templateNameControl.hasError('required')) {
        this.formError.templateName = 'Template Name is required.';
      } else if (this.templateNameControl.hasError('trimmedEmpty')) {
        this.formError.templateName = 'Template Name cannot be blank.';
      } else if (this.templateNameControl.hasError('minlength')) {
        this.formError.templateName = 'Template Name must be at least 2 characters.';
      } else if (this.templateNameControl.hasError('maxlength')) {
        this.formError.templateName = 'Template Name cannot exceed 100 characters.';
      }
    }

    if (this.templateForm.get('workItem')?.invalid) {
      this.formError.workItem = 'Work Item is required.';
    }

    this.validateRowDuplicates();
    this.validateOptionRows();

    if (this.templateForm.invalid) {
      this.submitError = 'Please fix validation errors before saving.';
      return;
    }

    this.isSubmitting = true;
    const workItemCode = this.templateForm.get('workItem')?.value;
    const workItem = this.workItemMap.get(workItemCode);
    
    if (!workItem) {
      this.submitError = 'Invalid work item selected.';
      this.isSubmitting = false;
      return;
    }

    const basePayload: DetailsTemplateRequest = {
      templateName: this.templateNameControl.value.trim(),
      workItemId: workItem.itemId,
      companyId: Number(this.orgId),
      createdBy: this.isEditMode ? '' : (localStorage.getItem('userRole') || ''),
      updatedBy: this.isEditMode ? (localStorage.getItem('userRole') || '') : '',
      templateDetails: this.templateDetails.controls.map((rowControl) => {
        const row = rowControl as FormGroup;
        const fieldTypeCode = row.get('fieldType')?.value;
        const fieldTypeItem = this.fieldTypeMap.get(fieldTypeCode);
        const options = (row.get('options')?.value || []) as DropdownOption[];
        return {
          fieldName: row.get('fieldName')?.value.trim(),
          fieldTypeId: fieldTypeItem ? fieldTypeItem.typeId : 0,
          mandatory: row.get('mandatory')?.value || false,
          ...(this.isOptionFieldType(fieldTypeCode) ? { options } : {})
        };
      })
    };

    if (this.isEditMode && this.editingTemplateId) {
      const updatePayload = { ...basePayload, templateId: this.editingTemplateId };
      this.subscriptions.add(
        this.detailsTemplateService.updateTemplate(updatePayload).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.submitSuccess = 'Template updated successfully.';
            setTimeout(() => {
              this.templateForm.markAsPristine();
              this.isEditMode = false;
              this.editingTemplateId = null;
              this.selectTab('list');
            }, 1500);
          },
          error: (error) => {
            this.isSubmitting = false;
            this.submitError = error?.error?.message || 'Unable to update the template. Please try again.';
          }
        })
      );
    } else {
      this.subscriptions.add(
        this.detailsTemplateService.createTemplate(basePayload).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.submitSuccess = 'Template created successfully.';
            setTimeout(() => {
              this.templateForm.markAsPristine();
              this.selectTab('list');
            }, 1500);
          },
          error: (error) => {
            this.isSubmitting = false;
            this.submitError = error?.error?.message || 'Unable to create the template. Please try again.';
          }
        })
      );
    }
  }

  onCancel(): void {
    if (this.templateForm.dirty) {
      const dialogData: ConfirmationDialogData = {
        title: 'Unsaved changes',
        message: 'You have unsaved changes. Do you want to discard them and leave?',
        confirmText: 'Discard',
        cancelText: 'Stay',
        type: 'info'
      };

      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: '420px',
        data: dialogData
      });

      dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.backToHome();
        }
      });
      return;
    }

    this.backToHome();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'create') {
      this.pageTitle = this.isEditMode ? 'Edit Details Template' : 'Create Details Template';
      if (!this.isEditMode) {
        this.resetForm();
      }
    } else if (tab === 'list') {
      this.isEditMode = false;
      this.editingTemplateId = null;
      this.loadTemplateList();
    }
  }

  private loadTemplateList(): void {
    if (!this.orgId) {
      this.templates = [];
      return;
    }
    this.templateListLoading = true;
    this.subscriptions.add(
      this.detailsTemplateService.getTemplateList(this.orgId).subscribe({
        next: (result) => {
          const items = (result as any).attributes || [];
          const templates = Array.isArray(items) ? items as TemplatesDetails[] : [];
          this.templates = templates.map((template) => {
            const resolvedCode = this.getWorkItemCodeByItemId(template.workItemId);
            const resolvedLabel = resolvedCode ? this.getWorkItemLabel(resolvedCode) : '';
            return {
              ...template,
              workItemCode: template.workItemCode || resolvedCode,
              workItemLabel: template.workItemLabel || resolvedLabel
            };
          });
          this.templateListLoading = false;
        },
        error: (err) => {
          console.error('Failed to load templates', err);
          this.submitError = 'Failed to load templates. Please try again.';
          this.templates = [];
          this.templateListLoading = false;
        }
      })
    );
  }

  onEditTemplate(template: TemplatesDetails): void {
    this.detailsTemplateService.getTemplateById(template.templateId).subscribe({
      next: (result) => {
        const templateDetail = (result as any).attributes || template;
        console.log('Loaded template details for editing:', templateDetail);
        if (!this.dataLoadReady) {
          this.dataLoadPromise.then(() => this.populateEditForm(templateDetail));
        } else {
          this.populateEditForm(templateDetail);
        }
        this.isEditMode = true;
        this.editingTemplateId = template.templateId;
        this.activeTab = 'create';
        this.pageTitle = 'Edit Details Template';
      },
      error: (err) => {
        console.error('Failed to load template details', err);
        this.submitError = 'Unable to load template details for editing.';
      }
    });
  }

  private populateEditForm(template: TemplatesDetails): void {
    const workItemCode = this.getWorkItemCodeByItemId(template.workItemId);
    
    this.templateForm.patchValue({
      templateName: template.templateName,
      workItem: workItemCode
    });

    // Disable template name and work item fields during edit
    this.templateForm.get('templateName')?.disable({ emitEvent: false });
    this.templateForm.get('workItem')?.disable({ emitEvent: false });

    this.templateDetails.clear();
    if (template.templateDetails && template.templateDetails.length > 0) {
      template.templateDetails.forEach((detail) => {
        const fieldTypeCode = this.getFieldTypeCodeByTypeId(detail.fieldTypeId);
        this.templateDetails.push(
          this.fb.group({
            fieldName: [detail.fieldName, [Validators.required, Validators.minLength(2), Validators.maxLength(100), this.trimValidator]],
            fieldType: [fieldTypeCode, Validators.required],
            mandatory: [detail.mandatory || false],
            options: this.fb.array(
              (detail.options || []).map((option) => this.createOptionGroup(option))
            )
          })
        );
      });
    } else {
      this.templateDetails.push(this.createTemplateDetail());
    }
    this.templateForm.markAsPristine();
  }

  private getFieldTypeCodeByTypeId(typeId: number): string {
    for (const [code, item] of this.fieldTypeMap.entries()) {
      if (item.typeId === typeId) {
        return code;
      }
    }
    return '';
  }

  private getWorkItemCodeByItemId(itemId: number): string {
    for (const [code, item] of this.workItemMap.entries()) {
      if (item.itemId === itemId) {
        return code;
      }
    }
    return '';
  }

  onDeleteTemplate(template: TemplatesDetails): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Template',
      message: `Are you sure you want to delete template "${template.templateName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) {
        return;
      }
      this.subscriptions.add(
        this.detailsTemplateService.deleteTemplate(template.templateId).subscribe({
          next: () => {
            this.submitSuccess = 'Template deleted successfully.';
            this.loadTemplateList();
          },
          error: (err) => {
            console.error('Delete failed', err);
            this.submitError = err?.error?.message || 'Failed to delete template. Please try again.';
          }
        })
      );
    });
  }

  onViewTemplateConfig(template: TemplatesDetails): void {
    if (!template.templateDetails || template.templateDetails.length === 0) {
      this.showSnack('No field configurations available.', false);
      return;
    }

    const configText = template.templateDetails
      .map((detail, index) => {
        const fieldTypeCode = this.getFieldTypeCodeByTypeId(detail.fieldTypeId);
        const fieldTypeName = this.getFieldTypeNameByTypeId(detail.fieldTypeId);
        const mandatory = detail.mandatory ? 'Required' : 'Optional';
        const optionsCount = detail.options?.length || 0;
        const optionsText = optionsCount > 0 ? ` (${optionsCount} options)` : '';
        return `${index + 1}. ${detail.fieldName} - ${fieldTypeName} - ${mandatory}${optionsText}`;
      })
      .join('\n');

    const dialogData: ConfirmationDialogData = {
      title: `Template Configuration: ${template.templateName}`,
      message: configText,
      confirmText: 'Close',
      cancelText: '',
      showCancel: false,
      type: 'info'
    };

    this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: dialogData
    });
  }

  private getFieldTypeNameByTypeId(typeId: number): string {
    for (const item of this.fieldTypeMap.values()) {
      if (item.typeId === typeId) {
        return item.label;
      }
    }
    return 'Unknown';
  }

  resetForm(): void {
    this.templateForm.reset();
    this.templateForm.get('templateName')?.enable({ emitEvent: false });
    this.templateForm.get('workItem')?.enable({ emitEvent: false });
    this.templateDetails.clear();
    this.templateDetails.push(this.createTemplateDetail());
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.isSubmitting = false;
  }

  cancelForm(): void {
    this.templateForm.markAsPristine();
    this.selectTab('list');
  }

  backToHome(): void {
    this.router.navigate(['/settings']);
  }

  onViewRow(index: number): void {
    this.selectTab('create');
    setTimeout(() => {
      const rowElement = document.querySelectorAll('.template-row')[index] as HTMLElement | null;
      rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  getFieldErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.touched) {
      return '';
    }
    const formControl = control as FormControl;
    if (formControl.hasError('required')) {
      return 'This field is required.';
    }
    if (formControl.hasError('trimmedEmpty')) {
      return 'Value cannot be empty or whitespace.';
    }
    if (formControl.hasError('minlength')) {
      return 'Enter at least 2 characters.';
    }
    if (formControl.hasError('maxlength')) {
      return 'Maximum 100 characters allowed.';
    }
    if (formControl.hasError('duplicateFieldName')) {
      return 'Duplicate field name for the same work item.';
    }
    return '';
  }

  getOptionSummary(index: number): string {
    const options = this.getRowOptions(index);
    if (!options.length) {
      return 'No options configured.';
    }
    return options.map((option) => option.label).join(', ');
  }

  getTopLevelWorkItemLabel(): string {
    const workItemValue = this.templateForm.get('workItem')?.value;
    const workItem = this.workItemOptions.find((item) => item.value === workItemValue);
    return workItem?.label || '-';
  }

  getFieldTypeLabel(row: FormGroup): string {
    const fieldTypeValue = row.get('fieldType')?.value;
    const fieldType = this.fieldTypeOptions.find((type) => type.value === fieldTypeValue);
    return fieldType?.label || fieldTypeValue || '-';
  }

  getWorkItemLabel(code: string): string {
    const item = this.workItemOptions.find((item) => item.value === code);
    return item?.label || code || '-';
  }

  private beforeUnloadListener = (event: BeforeUnloadEvent): void => {
    if (this.templateForm.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  private showSnack(message: string, isError = false): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success']
    });
  }

  getWorkItemIdByCode(code: string): number | null {
    const item = this.workItemMap.get(code);
    return item ? item.itemId : null;
  }

  getFieldTypeIdByCode(code: string): number | null {
    const item = this.fieldTypeMap.get(code);
    return item ? item.typeId : null;
  }
}
