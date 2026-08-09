import { CompanyMaster } from './company-master';
import { CalendarMasterVO } from './calendar-master';
import { SkillMaster } from './skill-master';
import { CountryMaster } from './company-master';
import { CityMaster, LanguageMaster } from './city-master';
import { UserVO } from './user-vo';

export interface AgentRequest {
  agentId?: number;
  agentName: string;
  mailId: string;
  accessId: string;
  phoneCode: string;
  phoneNumber: string;  
  orgId: number;
  skills: SkillMaster[];
  calendarId: number;
  countryId: number;
  cityId: number;
  languageId?: number;
  languageIds?: number[];
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}

export interface UserLanguageMapping {
  mappingId: number;
  user?: UserVO;
  language?: LanguageMaster;
  createdBy: string;
  updatedBy: string;
}

export interface AgentMaster {
  agentId: number;
  agentName: string;
  mailId: string;
  accessId: string;
  phone: string;
  phoneCode: string;
  phoneNumber: string;
  organization: CompanyMaster;
  calendar: CalendarMasterVO;
  country: CountryMaster;
  city: CityMaster;
  languages?: UserLanguageMapping[];
  localTime: string; // calculated field
  createdBy: string;
  updatedBy: string;
}

export interface AgentSkillsMapping {
  agentSkillId: number;
  agent: AgentMaster;
  skill: SkillMaster;
}

export interface CountryMasterVO {
  countryId: number;
  countryName: string;
  isoCode: string;
}