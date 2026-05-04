import { CompanyMaster, CountryMaster } from './company-master';
import { CityMaster, LanguageMaster } from './city-master';

export interface AgentSkillMapping {
  agentSkillId: number;
  skill: SkillVO;
}

export interface SkillVO {
  skillId: number;
  skillName: string;
  experienceYears: number;
  experienceMonths: number;
}

export interface AgentMasterVO {
  agentId: number;
  agentName: string;
  mailId: string;
  accessId: string;
  phone: string;
  organization: CompanyMaster
  agentSkillsMappings: AgentSkillMapping[];
}

export interface UserVO {
  userId: number;
  userName: string;
  middleName: string;
  firstName: string;
  lastName: string;
  registerId: string;
  email: string;
  role: string;
  phoneCode: string;
  phoneNumber: string;
  agent: AgentMasterVO;
  country: CountryMaster;
  city: CityMaster;
  language: LanguageMaster;
}
