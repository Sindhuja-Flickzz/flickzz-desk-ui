import { CountryMaster } from "./company-master";

export interface CompanyMaster {
  companyId: number;
  companyName: string;
  registeredNumber: string;
  uid: string;
  country: CountryMaster;
  address: string;
  employeeSize: number;
  mail: string;
  createdBy: string;
  updatedBy: string;
}

export interface PriorityMaster {
  priorityId: number;
  code: string;
  level: number;
  description: string;
  ticketType: TicketTypeMaster;
  createdBy: string;
  updatedBy: string;
}

export interface PriorityRequest {
  priorityId?: number;
  priorityName: string;
  orgId: number;
  level?: number;
  description?: string;
  ticketTypeId: number;
  colorCode: string;
  responseSla: number;
  resolutionSla: number;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}

export interface TicketTypeMaster {
  ticketTypeId?: number;
  ticketTypeName: string;
}