export interface SkillMaster {
  skillId: number;
  skillName: string;
  createdBy: string;
  updatedBy: string;
}

export interface SkillRequest {
  skillId?: number;
  skillName: string;
  createdBy: string;
  updatedBy: string;
}