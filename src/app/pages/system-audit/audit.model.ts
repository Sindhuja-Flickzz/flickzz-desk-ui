export interface AuditFilter {
  action?: string;
  area?: string;
  status?: string;
  userName?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  orgId?: number;
}

export interface PageRequest {
  page: number;
  size: number;
  sort?: string;
}

export interface Audit {
  id?: number;
  auditId?: string;
  createdAt?: string;
  area?: string;
  action?: string;
  userName?: string;
  status?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  changedFields?: string;
  errorMessage?: string;
  companyId?: number;
  entityName?: string;
  entityId?: number;
}

export interface AuditChangeField {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ParsedAuditValue {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
