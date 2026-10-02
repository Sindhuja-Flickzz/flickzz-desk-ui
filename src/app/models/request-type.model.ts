export interface RequestType {
  requestTypeId: number;
  requestTypeName: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface RequestTypeRequest {
  requestTypeName: string;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
  companyId: number;
}
