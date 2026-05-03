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
  registeredNumber: string;
  uid: string;
  country: CountryMaster;
  employeeSize: number;
  address: string;
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
  phone: string;
  country: EnquiryCountryVO;
  employeeSize: number;
}

export interface EnquiryCompanyVO {
  companyId?: number;
  uid: string;
  companyName: string;
  address?: string;
  mail?: string;
  employeeSize?: number;
}

export interface EnquiryCountryVO {
  countryId: number;
  registeredNumber: string;
}

export interface CompanyRequest {
  companyId?: number;
  companyName: string;
  registeredNumber: string;
  uid: string;
  countryId: number;
  address: string;
  employeeSize: number;
  mail: string;
  createdBy: string;
  updatedBy: string;
}