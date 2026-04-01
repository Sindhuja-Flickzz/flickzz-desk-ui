export interface CountryMaster {
  countryId: number;
  countryName: string;
  isoCode: string;
  currency: string;
}

export interface CompanyMaster {
  companyId: number;
  companyName: string;
  registeredNumber: string;
  country: CountryMaster;
  address: string;
  mail: string;
  isBoth: boolean;
  isServiceProvider: boolean;
  isRequestor: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface CompanyRequest {
  companyId?: number;
  companyName: string;
  registeredNumber: string;
  countryId: number;
  address: string;
  mail: string;
  markAsServiceProvider: boolean;
  isServiceProvider: boolean;
  isRequestor: boolean;
  createdBy: string;
  updatedBy: string;
}