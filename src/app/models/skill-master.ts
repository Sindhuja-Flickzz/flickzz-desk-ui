export interface SkillMaster {
  skillId: number;
  skillName: string;
  experienceYears: number;
  experienceMonths: number;
  createdBy: string;
  updatedBy: string;
}

export interface SkillRequest {
  skillId?: number;
  skillName: string;
  experienceYears: number;
  experienceMonths: number;
  createdBy: string;
  updatedBy: string;
}