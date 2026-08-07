import { CompanyMaster } from './company-master';

export interface BPConfigurationChangeRequestVO {
  ccrId?: number;
  configuration?: any;
  changedRequestId?: number;
  sourceChangeId?: number;
  bpPriority?: boolean;
  bpSla?: boolean;
  category?: boolean;
  supportGroup?: boolean;
  assignment?: boolean;
  operation?: string;
  requestedByOrg?: CompanyMaster;
  requestedByUserId?: number;
  approvalOrg?: CompanyMaster;
  status?: string;
  totalInternalApprovalLevels?: number;
  currentInternalApprovalLevel?: number;
  totalBpApprovalLevels?: number;
  currentBpApprovalLevel?: number;
  createdOn?: string | null;
  createdBy?: number;
  updatedOn?: string | null;
  updatedBy?: number;
  isCreatorAdmin?: boolean;
}

export interface BPConfigurationChangeRequestRemarkVO {
  remarkId?: number;
  remarkType?: string;
  approverLevel?: number;
  approvalStatus?: string;
  userId?: number;
  organizationId?: number;
  remark?: string;
  createdOn?: string | null;
}

export interface ConfigChangeApprovalVO {
  approvalId?: number;
  changeRequest?: BPConfigurationChangeRequestVO;
  approvalType?: string;
  approverType?: string;
  approverLevel?: number;
  approverUserId?: number;
  approverOrgId?: number;
  status?: string;
  mandatory?: boolean;
  approvedOn?: string | null;
  remarks?: BPConfigurationChangeRequestRemarkVO[];
  createdBy?: number;
  createdByName?: string;
  createdOn?: string | null;
  updatedBy?: number;
  updatedOn?: string | null;
}
