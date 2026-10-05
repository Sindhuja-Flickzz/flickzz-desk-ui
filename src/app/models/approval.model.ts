export interface ApprovalRecord {
  approvalId: number;
  requestId: number;
  requestType: string;
  approvalType: string;
  approverLevel: number;
  approverUserId: number;
  approverOrgId: number;
  status: string;
  approverType: string;
  description: string;
  mandatory: boolean;
  approvedOn: string | null;
  remarks?: string | null;
  createdBy: number;
  createdOn: string;
  updatedBy: number;
  updatedOn: string;
}

export interface ApprovalListResponse {
  code: string;
  title: string;
  description: string;
  attributes: ApprovalRecord[];
}

export interface BusinessPartnerOrganization {
  companyId?: number | null;
  companyName?: string | null;
}

export interface BusinessPartnerConfigurationDetail {
  configurationId?: number | null;
  businessPartner?: {
    businessPartnerId?: number | null;
    company?: BusinessPartnerOrganization | null;
    mappedCompany?: BusinessPartnerOrganization | null;
    isServiceProvider?: boolean | null;
    isRequestor?: boolean | null;
    isBoth?: boolean | null;
    callHorizon?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
    version?: string | number | null;
    refNo?: string | null;
    refDate?: string | null;
    isActive?: boolean | null;
    createdBy?: number | null;
    updatedBy?: number | null;
    isCreatedByAdmin?: boolean | null;
    isUpdatedByAdmin?: boolean | null;
  } | null;
  isActive?: boolean | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  isCreatorAdmin?: boolean | null;
  isUpdaterAdmin?: boolean | null;
}

export interface BusinessPartnerChangeRequestRemark {
  remarkId?: number | null;
  approval?: unknown;
  remarkType?: string | null;
  approverLevel?: number | null;
  approvalStatus?: string | null;
  userId?: number | null;
  organizationId?: number | null;
  remark?: string | null;
  createdOn?: string | null;
}

export interface BusinessPartnerChangeRequest {
  ccrId?: number | null;
  configuration?: BusinessPartnerConfigurationDetail | null;
  changedRequestId?: number | null;
  sourceChangeId?: number | null;
  bpPriority?: boolean | null;
  bpSla?: boolean | null;
  category?: boolean | null;
  supportGroup?: boolean | null;
  assignment?: boolean | null;
  internalApprovalCompleted?: boolean | null;
  bpApprovalCompleted?: boolean | null;
  operation?: string | null;
  requestedByOrg?: BusinessPartnerOrganization | null;
  requestedByUserId?: number | null;
  approvalOrg?: BusinessPartnerOrganization | null;
  status?: string | null;
  totalInternalApprovalLevels?: number | null;
  currentInternalApprovalLevel?: number | null;
  totalBpApprovalLevels?: number | null;
  currentBpApprovalLevel?: number | null;
  requestedOn?: string | null;
  completedOn?: string | null;
  createdOn?: string | null;
  updatedOn?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  isCreatorAdmin?: boolean | null;
  remarks?: BusinessPartnerChangeRequestRemark[] | null;
}

export interface BusinessPartnerChangeRequestResponse {
  code?: string;
  title?: string;
  description?: string;
  attributes?: BusinessPartnerChangeRequest | null;
}

export interface TemplateDetails {
  fieldId: number;
  fieldName: string;
  value: string;
}

export interface RitmApprover {
  ticketApproverId: number;
  requestId: number;
  requestType: string;
  ticket: unknown | null;
  isGroupApprover: boolean;
  approverConfig: {
    approverConfigId: number;
    approverCode: string;
  } | null;
  approverAgent: {
    agentId: number;
    agentName: string;
  } | null;
  templateDetails : TemplateDetails[];
  approverSequence: number;
  isMainApprover: boolean;
  approvalStatus: string;
  approvalRemark: string | null;
  approvedOn: string | null;
  createdBy: number;
  createdOn: string;
  updatedBy: number | null;
  updatedOn: string | null;
  isActive: boolean;
}

export interface RitmApproverResponse {
  code?: string;
  title?: string;
  description?: string;
  attributes?: RitmApprover | null;
}