import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VariantService } from '../../../service/variant.service';
import { FieldTypeItem, TemplateDetailField, TemplatesDetails } from '../../../models/variant.model';
import { USER_ROLES } from '../../../data/app_constants';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

interface FieldVariantOption {
  variantKey: string;
  fieldId: number;
  templateId: number;
  templateName: string;
  fieldName: string;
  fieldTypeId: number;
  fieldTypeLabel: string;
  options: any[];
  detail: TemplateDetailField;
}

interface TemplateDetailRequest {
  companyId: number;
  fieldId: number;
  defaultValue: string;
  isEditable: boolean;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}

interface DefaultTemplateField {
  fieldId: number;
  fieldName: string;
  defaultValue: string;
  fieldTypeId: number;
  fieldTypeLabel?: string;
  editable: boolean;
  isEditable?: boolean;
  options?: any[];
}

interface TemplateFormErrors {
  fieldVariant?: string;
  defaultValue?: string;
}

@Component({
  selector: 'app-templatecomponent',
  templateUrl: './templatecomponent.component.html',
  styleUrls: ['./templatecomponent.component.scss']
})
export class TemplatecomponentComponent implements OnInit {
  templateForm: FormGroup;
  activeTab: 'create' | 'edit' | 'list' = 'create';
  fieldVariants: FieldVariantOption[] = [];
  templates: DefaultTemplateField[] = [];
  fieldTypeMap = new Map<number, FieldTypeItem>();
  loading = false;
  listLoading = false;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';
  formError: TemplateFormErrors = {};
  orgId = '';
  editingDetail: any | null = null;
  originalDefaultValue = '';

  constructor(
    private fb: FormBuilder,
    private variantService: VariantService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.orgId = localStorage.getItem('userOrgId') || '';
    this.templateForm = this.fb.group({
      fieldVariant: ['', Validators.required],
      defaultValue: [''],
      isEditable: [true]
    });
  }

  ngOnInit(): void {
    this.loadFieldVariants();
  }

  get selectedFieldVariant(): FieldVariantOption | undefined {
    const selectedKey = this.templateForm.get('fieldVariant')?.value;
    return this.fieldVariants.find((variant) => variant.variantKey === selectedKey);
  }

  get isEditing(): boolean {
    return this.activeTab === 'edit' && !!this.editingDetail;
  }

  get isDefaultValueChanged(): boolean {
    const currentValue = this.templateForm.get('defaultValue')?.value?.toString() || '';
    return this.isEditing && currentValue !== this.originalDefaultValue;
  }

  loadFieldVariants(): void {
    if (!this.orgId) {
      this.submitError = 'Organization information is missing.';
      return;
    }

    this.loading = true;
    this.submitError = '';
    this.variantService.getFieldTypeList(this.orgId).subscribe({
      next: (response) => {
        const fieldTypes = this.getArray(response);
        this.fieldTypeMap.clear();
        fieldTypes.forEach((fieldType: FieldTypeItem) => this.fieldTypeMap.set(fieldType.typeId, fieldType));
        this.loadTemplates();
      },
      error: () => {
        this.fieldTypeMap.clear();
        this.loadTemplates();
      }
    });
  }

  private loadTemplates(): void {
    this.variantService.getTemplateList(this.orgId).subscribe({
      next: (response) => {
        const templates = this.getArray(response) as TemplatesDetails[];
        this.fieldVariants = templates.reduce((variants: FieldVariantOption[], template) => {
          (template.templateDetails || []).forEach((detail) => {
            if ((detail.options || []).length === 0) {
              variants.push({
                variantKey: `${template.templateId}:${variants.length}`,
                fieldId: Number(detail.fieldId || 0),
                templateId: template.templateId,
                templateName: template.templateName,
                fieldName: detail.fieldName,
                fieldTypeId: detail.fieldTypeId,
                fieldTypeLabel: detail.fieldTypeLabel || this.fieldTypeMap.get(detail.fieldTypeId)?.label || String(detail.fieldTypeId),
                options: detail.options || [],
                detail: {
                  ...detail,
                  isEditable: detail.isEditable ?? (detail as any).editable ?? true
                }
              });
            }
          });
          return variants;
        }, []);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.fieldVariants = [];
        this.submitError = this.getErrorMessage(error, 'Failed to load field variants. Please try again.');
      }
    });
  }

  selectTab(tab: 'create' | 'edit' | 'list'): void {
    if (tab === 'edit' && !this.editingDetail) {
      return;
    }

    if ((tab === 'create' || tab === 'list') && this.editingDetail) {
      this.resetForm();
    }

    this.activeTab = tab;
    this.submitError = '';
    this.submitSuccess = '';
    this.formError = {};
    if (tab === 'list') {
      this.loadTemplateList();
    }
  }

  onFieldVariantChange(): void {
    this.formError = {};
    this.submitError = '';
    const selected = this.selectedFieldVariant;
    const defaultValueControl = this.templateForm.get('defaultValue');
    defaultValueControl?.reset('');
    defaultValueControl?.setValidators(selected ? [Validators.required] : []);
    defaultValueControl?.updateValueAndValidity({ emitEvent: false });
    this.templateForm.patchValue({ isEditable: selected?.detail?.isEditable ?? true });
    this.editingDetail = null;
    this.originalDefaultValue = '';
  }

  isTextInputField(fieldTypeLabel: string): boolean {
    const normalizedType = (fieldTypeLabel || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
    return normalizedType === 'TEXTBOX' || normalizedType === 'TEXT' || normalizedType === 'INPUT';
  }

  isTextareaField(fieldTypeLabel: string): boolean {
    const normalizedType = (fieldTypeLabel || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
    return normalizedType === 'TEXTAREA' || normalizedType === 'TEXTAREAFIELD';
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.templateForm.markAllAsTouched();

    if (!this.selectedFieldVariant) {
      this.formError.fieldVariant = 'Please select a field variant.';
      return;
    }

    const selected = this.selectedFieldVariant;
    const defaultValue = this.templateForm.get('defaultValue')?.value?.toString() || '';
    const isEditable = this.templateForm.get('isEditable')?.value === true;

    if (!defaultValue.trim()) {
      this.formError.defaultValue = 'Default value is required.';
      this.templateForm.get('defaultValue')?.setErrors({ required: true });
      return;
    }

    if (this.templateForm.invalid) {
      this.submitError = 'Please fix validation errors before saving.';
      return;
    }

    const userId = Number(localStorage.getItem('userId') || 0);
    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const payload: TemplateDetailRequest = {
      companyId: Number(this.orgId),
      fieldId: selected.fieldId,
      defaultValue,
      isEditable,
      createdBy: userId,
      updatedBy: userId,
      isCreatedByAdmin: isAdmin,
      isUpdatedByAdmin: isAdmin
    };

    this.isSubmitting = true;
    const saveRequest = this.editingDetail
      ? this.variantService.updateTemplateDetail(payload)
      : this.variantService.createTemplateDetail(payload);
    saveRequest.subscribe({
      next: () => {
        this.isSubmitting = false;
        const wasEditing = !!this.editingDetail;
        this.submitSuccess = wasEditing ? 'Template detail updated successfully.' : 'Template detail saved successfully.';
        this.resetForm();
        this.loadTemplateList();
        // if (wasEditing) {
          this.activeTab = 'list';
        // }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.submitError = this.getErrorMessage(error, 'Failed to save template detail. Please try again.');
      }
    });
  }

  resetForm(): void {
    this.templateForm.reset({ fieldVariant: '', defaultValue: '', isEditable: true });
    this.templateForm.get('defaultValue')?.clearValidators();
    this.templateForm.get('defaultValue')?.updateValueAndValidity({ emitEvent: false });
    this.formError = {};
    this.submitError = '';
    this.editingDetail = null;
    this.originalDefaultValue = '';
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  loadTemplateList(): void {
    if (!this.orgId) {
      this.templates = [];
      return;
    }

    this.listLoading = true;
    this.variantService.getDefaultTemplateList(this.orgId).subscribe({
      next: (response) => {
        this.templates = this.getArray(response).map((field: any) => ({
          ...field,
          fieldId: Number(field.fieldId || 0),
          editable: field.editable !== false,
          isEditable: field.isEditable ?? field.editable,
          fieldTypeLabel: field.fieldTypeLabel || this.fieldTypeMap.get(Number(field.fieldTypeId))?.label || String(field.fieldTypeId || '-')
        }));
        this.listLoading = false;
      },
      error: (error) => {
        this.templates = [];
        this.listLoading = false;
        this.submitError = this.getErrorMessage(error, 'Failed to load templates. Please try again.');
      }
    });
  }

  onEditTemplate(template: DefaultTemplateField): void {
    this.editTemplateDetail({
      ...template,
      isEditable: template.isEditable ?? template.editable
    });
  }

  onDeleteTemplate(template: DefaultTemplateField): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Template Field',
      message: `Are you sure you want to delete default value for "${template.fieldName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    this.dialog.open(ConfirmationDialogComponent, { width: '420px', data: dialogData })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) {
          return;
        }
        const userId = Number(localStorage.getItem('userId') || 0);
        const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
        this.variantService.deleteDefaultTemplateDetail({
          fieldId: template.fieldId,
          companyId: Number(this.orgId),
          updatedBy: userId,
          isUpdatedByAdmin: isAdmin
        }).subscribe({
          next: () => {
            this.submitSuccess = 'Template field deleted successfully.';
            setTimeout(() => { this.submitSuccess = '';this.loadTemplateList(); }, 3000);
          },
          error: (error) => {
            this.submitError = this.getErrorMessage(error, 'Failed to delete template. Please try again.');
          }
        });
      });
  }

  getFieldTypeLabel(detail: any): string {
    return detail.fieldTypeLabel || detail.fieldType || this.fieldTypeMap.get(detail.fieldTypeId)?.label || detail.fieldTypeId || '-';
  }

  editTemplateDetail(detail: any): void {
    const fieldId = Number(detail.fieldId || 0);
    const variant = this.fieldVariants.find((item) => item.fieldId === fieldId);
    if (!variant) {
      this.submitError = 'The field variant for this detail is no longer available.';
      return;
    }

    this.editingDetail = detail;
    this.originalDefaultValue = detail.defaultValue?.toString() || '';
    this.activeTab = 'edit';
    this.templateForm.patchValue({
      fieldVariant: variant.variantKey,
      defaultValue: detail.defaultValue || '',
      isEditable: detail.isEditable ?? detail.editable !== false
    });
    this.templateForm.get('defaultValue')?.setValidators([Validators.required]);
    this.templateForm.get('defaultValue')?.updateValueAndValidity({ emitEvent: false });
    this.submitError = '';
    this.submitSuccess = '';
  }

  backToSettings(): void {
    this.router.navigate(['/settings']);
  }

  private getArray(response: any): any[] {
    const data = response?.attributes ?? response;
    return Array.isArray(data) ? data : [];
  }

  private getErrorMessage(error: any, fallback: string): string {
    return error?.error?.description || error?.error?.message || error?.message || fallback;
  }
}
