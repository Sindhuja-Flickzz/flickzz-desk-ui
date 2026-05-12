import { CityMaster } from './city-master';
import { CompanyMaster, CountryMaster, StateMaster } from './company-master';

export interface EnquiryRegistrationVO {
  enquiryId: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  userName: string;
  password: string;
  userRole: string;
  email: string;
  company: CompanyMaster;
  phoneCode: string;
  phoneNumber: string;
  country: CountryMaster;
  state: StateMaster;
  city: CityMaster
}
