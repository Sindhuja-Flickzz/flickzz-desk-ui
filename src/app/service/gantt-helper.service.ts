import { Injectable } from '@angular/core';
import { EpicVO, UserStory } from '../models/project-builder';

export interface GanttDateRange {
  startDate: Date;
  endDate: Date;
  weeks: GanttWeek[];
  days: Date[];
}

export interface GanttWeek {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  month: string;
}

export interface GanttRowData {
  type: 'epic' | 'story';
  id: number;
  name: string;
  sequence: number;
  parentEpicId?: number;
  startDate?: Date;
  endDate?: Date;
  days?: number;
  workDays?: number;
  progress?: number;
  progressColor?: string;
  leads?: string[];
  isExpanded: boolean;
  taskBarStart?: number;
  taskBarWidth?: number;
  level: number;
  predecessorId?: number;
  dependencies?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class GanttHelperService {
  constructor() {}

  /**
   * Calculate days between two dates (inclusive)
   */
  calculateDays(startDate: string | null | undefined, endDate: string | null | undefined): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays);
  }

  /**
   * Calculate working days (excluding weekends)
   */
  calculateWorkDays(startDate: string | null | undefined, endDate: string | null | undefined): number {
    if (!startDate || !endDate) return 0;
    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize to start of day
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  }

  /**
   * Calculate epic progress percentage
   * Formula: (sum of story progressSequence / total stories) / maxProgressNumber * 100
   */
  calculateEpicProgress(epic: EpicVO): number {
    if (!epic.userStories || epic.userStories.length === 0) {
      return 0;
    }

    const maxProgress = epic.maxProgress || 5;
    const totalStories = epic.userStories.length;
    
    const sumProgressSequence = epic.userStories.reduce((sum, story) => {
      return sum + (story.progress?.progressSequence || 0);
    }, 0);
    console.log('sumProgressSequence', sumProgressSequence, 'totalStories', totalStories, 'maxProgress', maxProgress);
    const progress = (sumProgressSequence / totalStories) / maxProgress * 100;
    return Math.min(100, Math.round(progress * 10) / 10); // Round to 1 decimal place
  }

  /**
   * Generate date range with weeks
   */
  generateDateRange(startDate: Date, endDate: Date): GanttDateRange {
    const days: Date[] = [];
    const weeks: GanttWeek[] = [];
    
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    // Generate all days
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Group days into weeks
    let weekStart = new Date(startDate);
    weekStart.setHours(0, 0, 0, 0);
    
    // Adjust week start to Monday
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    
    const weekNum = this.getWeekNumber(weekStart);
    let currentWeekNum = weekNum;
    
    while (weekStart <= end) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const monthName = weekStart.toLocaleString('default', { month: 'short' });
      weeks.push({
        weekStart: new Date(weekStart),
        weekEnd: new Date(Math.min(weekEnd.getTime(), end.getTime())),
        weekNumber: currentWeekNum,
        month: monthName
      });
      
      weekStart.setDate(weekStart.getDate() + 7);
      currentWeekNum++;
    }
    
    return { startDate, endDate, weeks, days };
  }

  /**
   * Get week number of year
   */
  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const timeDiff = d.getTime() - yearStart.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7)) + 1;
  }

  /**
   * Calculate task bar position and width
   */
  calculateTaskBarPosition(
    taskStart: Date | null | undefined,
    taskEnd: Date | null | undefined,
    rangeStart: Date,
    rangeEnd: Date,
    totalDays: number
  ): { start: number; width: number } {
    if (!taskStart || !taskEnd) {
      return { start: 0, width: 0 };
    }

    const ts = new Date(taskStart);
    const te = new Date(taskEnd);
    ts.setHours(0, 0, 0, 0);
    te.setHours(0, 0, 0, 0);

    const rs = new Date(rangeStart);
    rs.setHours(0, 0, 0, 0);

    // Days from range start to task start
    const daysBeforeTask = Math.max(0, this.calculateDays(rs.toISOString().split('T')[0], ts.toISOString().split('T')[0]) - 1);
    
    // Task duration
    const taskDuration = this.calculateDays(ts.toISOString().split('T')[0], te.toISOString().split('T')[0]);

    const start = (daysBeforeTask / totalDays) * 100;
    const width = (taskDuration / totalDays) * 100;

    return {
      start: Math.max(0, start),
      width: Math.max(1, Math.min(100 - start, width)) // Ensure width doesn't exceed container
    };
  }

  /**
   * Check if date is weekend
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Check if date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Format date for display (short format)
   */
  formatDateShort(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  }

  /**
   * Get all epics sorted by sequence with stories sorted by sequence
   */
  getSortedEpicsWithStories(epics: EpicVO[]): EpicVO[] {
    if (!epics) return [];
    
    return epics
      .sort((a, b) => a.epicSequence - b.epicSequence)
      .map(epic => ({
        ...epic,
        userStories: epic.userStories
          ? epic.userStories.sort((a, b) => a.storySequence - b.storySequence)
          : []
      }));
  }

  /**
   * Build dependency map for stories
   */
  buildDependencyMap(stories: UserStory[]): Map<number, number[]> {
    const dependencyMap = new Map<number, number[]>();
    
    stories.forEach(story => {
      if (!dependencyMap.has(story.storyId)) {
        dependencyMap.set(story.storyId, []);
      }
      if (story.predecessorId) {
        const dependents = dependencyMap.get(story.predecessorId) || [];
        dependents.push(story.storyId);
        dependencyMap.set(story.predecessorId, dependents);
      }
    });

    return dependencyMap;
  }

  /**
   * Get all stories including from all epics
   */
  getAllStories(epics: EpicVO[]): UserStory[] {
    const allStories: UserStory[] = [];
    epics.forEach(epic => {
      if (epic.userStories) {
        allStories.push(...epic.userStories);
      }
    });
    return allStories;
  }

  /**
   * Find minimum and maximum dates from all stories
   */
  findDateRange(stories: UserStory[]): { minDate: Date | null; maxDate: Date | null } {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    stories.forEach(story => {
      if (story.plannedStartDate) {
        const startDate = new Date(story.plannedStartDate);
        if (!minDate || startDate < minDate) {
          minDate = startDate;
        }
      }
      if (story.plannedEndDate) {
        const endDate = new Date(story.plannedEndDate);
        if (!maxDate || endDate > maxDate) {
          maxDate = endDate;
        }
      }
    });

    return { minDate, maxDate };
  }

  /**
   * Pad date range with buffer days
   */
  padDateRange(minDate: Date | null, maxDate: Date | null, bufferDays: number = 7): { start: Date; end: Date } {
    if (!minDate || !maxDate) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
      };
    }

    const start = new Date(minDate);
    start.setDate(start.getDate() - bufferDays);
    
    const end = new Date(maxDate);
    end.setDate(end.getDate() + bufferDays);

    return { start, end };
  }
}
