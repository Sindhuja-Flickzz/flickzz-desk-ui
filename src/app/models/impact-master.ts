import { CompanyMaster, CountryMaster } from './company-master';

export interface ImpactMasterVO {
  impactId: number;
  impactCode: string;
  impactLevel: number;
  slaMultiplier: number;
  organization: CompanyMaster;
  createdBy?: string;
  updatedBy?: string;
}

export interface ImpactRequest {
  impactId?: number;
  impactCode: string;
  impactLevel: number;
  slaMultiplier: number;
  orgId: number;
  createdBy: string;
  updatedBy: string;
}
