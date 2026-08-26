import { CompanyMaster } from "./company-master";

export interface RequestConfigRequest {
  configId?: number;
  requestType: string;
  requestPrefix: string;
  rangeFrom: number;
  rangeTo: number;
  calculateBackward: boolean;
  callHorizonDays: number;
  callHorizonPercentage: number;
  orgId: number;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}

export interface RequestConfigVO {
  configId: number;
  requestType: string;
  requestPrefix: string;
  revision: number;
  rangeFrom: number;
  rangeTo: number;
  calculateBackward: boolean;
  isActive: boolean;
  isEnabled: boolean;
  callHorizonDays: number;
  callHorizonPercentage: number;
  company?: CompanyMaster;
}
