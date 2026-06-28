import { CityMaster } from "./city-master";

export interface CountryMaster {
  countryId: number;
  countryName: string;
  isoCode: string;
  phoneCode: string;
  currencyCode: string;
  currencyName: string;
  timezone: string;
}

export interface CompanyMaster {
  companyId: number;
  companyName: string;  
  phoneCode: string;
  registeredNumber: string;
  uid: string;
  country: CountryMaster;
  state: StateMaster;
  city: CityMaster;
  addressLine1: string;
  addressLine2: string;
  pinCode: string;
  employeeSize: number;
  mail: string;
  createdBy: string;
  updatedBy: string;
}

export interface EnquiryRegistration {
  enquiryId: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  userName: string;
  password: string;
  userRole: string;
  email: string;
  company: EnquiryCompanyVO;
  phoneCode: string;
  phoneNumber: string;
  country: EnquiryCountryVO;
  city: CityMaster;
  employeeSize: number;
}

export interface EnquiryCompanyVO {
  companyId?: number;
  uid: string;
  companyName: string;
  country?: CountryMaster;
  state: StateMaster;
  city: CityMaster;
  pinCode: string;
  addressLine1: string;
  addressLine2?: string;
  mail?: string;
  employeeSize?: number;
  phoneCode?: string;
  registeredNumber: string;
}

export interface EnquiryCountryVO {
  countryId: number;
  registeredNumber: string;
  isoCode: string;
  phoneCode: string;
}

export interface StateMaster {
  stateId: number;
  stateName: string;
  countryId: number;
}

export interface CompanyRequest {
  companyId?: number;
  companyName: string;
  registeredNumber: string;
  uid: string;
  countryId: number;
  address?: string;
  addressLine1: string;
  addressLine2?: string;
  stateId?: number;
  cityId?: number;
  pinCode?: string;
  employeeSize: number;
  mail: string;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}

export interface CompanyRole {
  roleId: number;
  company: CompanyMaster;
  mappedCompany: CompanyMaster;
  isServiceProvider: boolean;
  isRequestor: boolean;
  isBoth: boolean;  
  createdBy: string;
  updatedBy: string;
}

export interface CompanyBpRequest {
  companyId: number;
  bpUid: string;
  createdBy: number;
  isCreatedByAdmin: boolean;
  callHorizonDays: number;
  validFrom: string;
  validTo: string;
  refNumber: string;
  refDate: string;
}