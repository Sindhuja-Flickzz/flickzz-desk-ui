export interface EffortType {
  id?: number;
  effortTypeId?: number;
  typeName: string;
  sequence: number;
  isActive?: boolean;
}

export interface EffortTypeRequest {
  typeName: string;
  sequence: number;
  orgId: number;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}

export interface EffortTypeStatusChangeRequest {
  effortTypeId: number;
  orgId: number;
  isActive: boolean;
  updatedBy: number;
  isUpdaterAdmin: boolean;
}

export interface EffortTypeRowErrors {
  typeName?: string;
  sequence?: string;
}
