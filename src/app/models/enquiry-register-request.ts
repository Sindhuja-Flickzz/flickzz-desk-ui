export interface EnquiryRegisterRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  orgName: string;
  phoneCode: string;
  phoneNumber: string;
  countryId: number;
  employeeSize: number;
}
