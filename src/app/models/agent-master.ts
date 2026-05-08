import { CompanyMaster } from './company-master';
import { CalendarMasterVO } from './calendar-master';
import { SkillMaster } from './skill-master';
import { CountryMaster } from './company-master';
import { CityMaster, LanguageMaster } from './city-master';

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
  languageId: number;
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
  language: LanguageMaster;
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