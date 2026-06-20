export enum WorkItemType {
  EPIC = 'EPIC',
  USER_STORY = 'USER_STORY',
  TASK = 'TASK',
  SUB_TASK = 'SUB_TASK'
}

export enum FieldType {
  TEXTBOX = 'TEXTBOX',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DATE_PICKER = 'DATE_PICKER',
  DROPDOWN = 'DROPDOWN',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  MULTISELECT = 'MULTISELECT',
  EMAIL = 'EMAIL',
  URL = 'URL'
}

export interface DropdownOption {
  label: string;
  value: string;
  defaultSelected: boolean;
}

export interface TemplateDetail {
  fieldName: string;
  fieldTypeId: number;
  mandatory: boolean;
  options?: DropdownOption[];
}

export interface WorkItem {
  itemId: number;
  code: string;
  label: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface FieldTypeItem {
  typeId: number;
  code: string;
  label: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface DetailsTemplateRequest {
  templateName: string;
  workItemId: number;
  companyId: number;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
  templateDetails: TemplateDetail[];
}

export interface TemplateDetailField extends TemplateDetail {
  fieldTypeLabel?: string;
}

export interface TemplatesDetails {
  templateId: number;
  templateName: string;
  workItemId: number;
  workItemCode?: string;
  workItemLabel?: string;
  templateDetails: TemplateDetailField[];
  createdBy?: string;
  updatedBy?: string;
  createdDate?: string;
  updatedDate?: string;
}
