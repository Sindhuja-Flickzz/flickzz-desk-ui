export interface CompanyMaster {
  companyId: number;
  companyName: string;
}

export interface PriorityMaster {
  priorityId: number;
  priorityName: string;
  organization: CompanyMaster;
  rank: number;
  colorCode: string;
  responseSla: number;
  resolutionSla: number;
  createdBy: string;
  updatedBy: string;
}

export interface PriorityRequest {
  priorityId?: number;
  priorityName: string;
  orgId: number;
  rank: number;
  colorCode: string;
  responseSla: number;
  resolutionSla: number;
  createdBy: string;
  updatedBy: string;
}