export interface EffortAmount {
  hours: number;
  minutes: number;
  formatted: string;
}

export interface EffortSummaryAgent {
  agentId: number;
  agentName: string;
  effort: EffortAmount;
}

export interface EffortSummarySubtask {
  subtaskId: number;
  subtaskNumber: string;
  totalLoggedEffort: EffortAmount;
  agents: EffortSummaryAgent[];
}

export interface EffortSummary {
  ticketId: number;
  ticketNumber: string;
  plannedEffort: EffortAmount;
  ticketLoggedEffort: EffortAmount;
  subtasksLoggedEffort: EffortAmount;
  totalLoggedEffort: EffortAmount;
  agents: EffortSummaryAgent[];
  subtasks: EffortSummarySubtask[];
}

export interface EffortSummaryResponse {
  code: string;
  title: string;
  description: string;
  attributes: EffortSummary;
}
