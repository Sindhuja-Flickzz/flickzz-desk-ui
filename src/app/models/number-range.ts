import { PlantMaster } from './plant-master';

export interface RequestConfigRequest {
  configId?: number;
  requestType: string;
  requestPrefix: string;
  revision: number;
  rangeFrom: number;
  rangeTo: number;
  calculateBackward: boolean;
  plantId: number;
  createdBy: string;
  updatedBy: string;
}

export interface RequestConfigVO {
  configId: number;
  requestType: string;
  requestPrefix: string;
  revision: number;
  rangeFrom: number;
  rangeTo: number;
  calculateBackward: boolean;
  plant?: PlantMaster;
}
