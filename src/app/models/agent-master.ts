import { CompanyMaster } from './company-master';
import { CalendarMasterVO } from './calendar-master';
import { SkillMaster } from './skill-master';

export interface AgentRequest {
  agentId?: number;
  agentName: string;
  mailId: string;
  accessId: string;
  phone: string;
  orgId: number;
  skills: number[];
  calendarId: number;
  createdBy: string;
  updatedBy: string;
}

export interface AgentMaster {
  agentId: number;
  agentName: string;
  mailId: string;
  accessId: string;
  phone: string;
  organization: CompanyMaster;
  calendar: CalendarMasterVO;
  createdBy: string;
  updatedBy: string;
}

export interface AgentSkillsMapping {
  agentSkillId: number;
  agent: AgentMaster;
  skill: SkillMaster;
}