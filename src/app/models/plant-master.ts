import { CalendarMasterVO } from './calendar-master';

export interface CountryMasterVO {
  countryId: number;
  countryName: string;
  isoCode: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface PlantMaster {
  plantId: number;
  plantName: string;
  region: CountryMasterVO;
  calendar: CalendarMasterVO;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface PlantMasterRequest {
  plantId?: number;
  plantName: string;
  countryId: number;
  calendarId: number;
  createdBy: string;
  updatedBy: string;
}
