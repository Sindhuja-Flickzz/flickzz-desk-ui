export interface EnquiryRegisterRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  orgName: string;
  phone: string;
  countryId: number;
  employeeSize: number;
}
