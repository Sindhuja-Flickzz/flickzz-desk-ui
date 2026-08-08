import { AgentMaster } from './agent-master';
import { CalendarMasterVO } from './calendar-master';

export interface CountryMasterVO {
  countryId: number;
  countryName: string;
  isoCode: string;
}

export interface WeekOff {
  weekOffId: number;
  weekOff: string;
}

export interface PlantMaster {
  plantId: number;
  plantName: string;
  agentPlantMappings: AgentMaster[];
  region: CountryMasterVO;
  calendar: CalendarMasterVO;
  weekOff?: WeekOff[];
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface PlantMasterRequest {
  plantId?: number;
  plantName: string;
  countryId: number;
  calendarId: number;
  agents?: number[];
  agentId?: number;
  weekOff?: string[];
  createdBy: number;
  updatedBy: number;
  companyId: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}
