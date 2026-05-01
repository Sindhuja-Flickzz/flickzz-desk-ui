export interface ServiceOffering {
  offeringId?: number;
  serviceId?: number;
  offeringName: string;
}

export interface BusinessService {
  serviceId: number;
  serviceName: string;
  serviceOfferings: ServiceOffering[];
  isActive?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface BusinessServiceRequest {
  serviceId?: number;
  serviceName: string;
  serviceOfferings: ServiceOffering[];
  createdBy: string;
  updatedBy: string;
}
