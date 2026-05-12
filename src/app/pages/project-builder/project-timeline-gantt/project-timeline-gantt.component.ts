import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ProjectVO, EpicVO, UserStory } from '../../../models/project-builder';
import { ProjectService } from '../../../service/project.service';
import { GanttHelperService, GanttDateRange, GanttRowData } from '../../../service/gantt-helper.service';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-project-timeline-gantt',
  templateUrl: './project-timeline-gantt.component.html',
  styleUrls: ['./project-timeline-gantt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectTimelineGanttComponent implements OnInit, OnChanges {
//   @Input() projectId?: number;
  @Input() project?: ProjectVO;
  @Output() backClicked = new EventEmitter<void>();
  
  @ViewChild('timelineScroll') timelineScroll?: ElementRef;
  @ViewChild('leftPanel') leftPanel?: ElementRef;
  @ViewChild('taskRows') taskRows?: ElementRef;

  // Data
  epics: EpicVO[] = [];
  ganttRows: GanttRowData[] = [];
  dateRange: GanttDateRange | null = null;
  expandedEpics = new Set<number>();
//   project?: ProjectVO;

  // State
  loading = true;
  error = '';
  isMobile = false;
  displayWeek = 1;
  totalWeeks = 0;
  projectId = this.project?.projectId || 0;

  // Current date indicator
  todayPosition = 0;
  showToday = false;

  // Drag state
  isDragging = false;
  private dragStartX = 0;
  private initialScrollLeft = 0;

  // Splitter state
  isSplitterDragging = false;
  private splitterDragStartX = 0;
  private initialLeftPanelWidth = 0;

  constructor(
    private projectService: ProjectService,
    private ganttHelper: GanttHelperService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      console.log('Project input changed:', this.project);
      this.loadProjectData();
    } else if (changes['projectId'] && this.projectId && !this.project) {
      console.log('Project ID changed:', this.projectId);
      this.loadProjectById(this.projectId);
    }
  }

  ngOnInit(): void {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());

    // Load from route if not provided as input
    this.route.params.pipe(take(1)).subscribe(params => {
      const projectId = params['projectId'];
      if (projectId) {
        this.loadProjectById(projectId);
      }
    });
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  onTimelinePointerDown(event: PointerEvent): void {
    if (!this.timelineScroll) {
      return;
    }

    this.isDragging = true;
    const element = this.timelineScroll.nativeElement;
    this.dragStartX = event.pageX - element.offsetLeft;
    this.initialScrollLeft = element.scrollLeft;
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  onTimelinePointerMove(event: PointerEvent): void {
    if (!this.isDragging || !this.timelineScroll) {
      return;
    }

    const element = this.timelineScroll.nativeElement;
    const x = event.pageX - element.offsetLeft;
    const walk = (x - this.dragStartX) * 1.5;
    element.scrollLeft = this.initialScrollLeft - walk;
  }

  onTimelinePointerUp(): void {
    this.isDragging = false;
  }

  // Splitter resize handling
  onSplitterMouseDown(event: MouseEvent | TouchEvent): void {
    this.isSplitterDragging = true;
    const pageX = event instanceof TouchEvent ? event.touches[0].pageX : event.pageX;
    this.splitterDragStartX = pageX;
    
    if (this.leftPanel) {
      this.initialLeftPanelWidth = this.leftPanel.nativeElement.offsetWidth;
    }
    
    document.addEventListener('mousemove', this.onSplitterMouseMove.bind(this));
    document.addEventListener('touchmove', this.onSplitterMouseMove.bind(this));
    document.addEventListener('mouseup', this.onSplitterMouseUp.bind(this));
    document.addEventListener('touchend', this.onSplitterMouseUp.bind(this));
    
    event.preventDefault();
  }

  onSplitterMouseMove(event: MouseEvent | TouchEvent): void {
    if (!this.isSplitterDragging || !this.leftPanel) {
      return;
    }

    const pageX = event instanceof TouchEvent ? event.touches[0].pageX : event.pageX;
    const delta = pageX - this.splitterDragStartX;
    const newWidth = Math.max(280, Math.min(this.initialLeftPanelWidth + delta, window.innerWidth * 0.6));
    
    this.leftPanel.nativeElement.style.width = newWidth + 'px';
    this.leftPanel.nativeElement.style.maxWidth = 'none';
    this.cdr.detectChanges();
  }

  onSplitterMouseUp(event: MouseEvent | TouchEvent): void {
    this.isSplitterDragging = false;
    
    document.removeEventListener('mousemove', this.onSplitterMouseMove.bind(this));
    document.removeEventListener('touchmove', this.onSplitterMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onSplitterMouseUp.bind(this));
    document.removeEventListener('touchend', this.onSplitterMouseUp.bind(this));
  }

  // Scroll synchronization
  onLeftPanelScroll(event: Event): void {
    if (!this.leftPanel || !this.taskRows) {
      return;
    }
    
    // Sync vertical scroll between left panel and task rows
    const scrollTop = (event.target as HTMLElement).scrollTop;
    if (this.taskRows.nativeElement.scrollTop !== scrollTop) {
      this.taskRows.nativeElement.scrollTop = scrollTop;
    }
  }

  onTimelineScroll(event: Event): void {
    // Timeline scroll event can be handled here for future enhancements
    // e.g., update visible columns, load more data, etc.
  }

  loadProjectById(projectId: number): void {
    this.loading = true;
    this.error = '';
    
    this.projectService.getProjectInfo(String(projectId)).subscribe({
      next: (project) => {
        this.project = (project as any).data?.attributes || (project as any).attributes || project;
        this.loadProjectData();
      },
      error: (err: any) => {
        this.error = 'Failed to load project. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadProjectData(): void {
    if (!this.project) {
      this.error = 'No project data available';
      this.loading = false;
      return;
    }

    try {
      // Sort epics and stories
      this.epics = this.ganttHelper.getSortedEpicsWithStories(this.project.epics || []);

      // Get all stories to determine date range
      const allStories = this.ganttHelper.getAllStories(this.epics);
      if (allStories.length === 0) {
        // No stories, set default date range (current month)
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        this.dateRange = this.ganttHelper.generateDateRange(start, end);
        this.totalWeeks = this.dateRange.weeks.length;
        this.calculateTodayPosition();
        this.buildGanttRows();
        this.error = '';
        this.cdr.detectChanges();
        this.loading = false;
        return;
      }

      // Find date range
      const { minDate, maxDate } = this.ganttHelper.findDateRange(allStories);
      const { start, end } = this.ganttHelper.padDateRange(minDate, maxDate, 7);
      // Generate date range and weeks
      this.dateRange = this.ganttHelper.generateDateRange(start, end);
      this.totalWeeks = this.dateRange.weeks.length;

      // Calculate today position
      this.calculateTodayPosition();
      
      // Build gantt rows
      this.buildGanttRows();

      this.error = '';
      this.cdr.detectChanges();
      this.loading = false;
    } catch (err) {
      this.error = 'Error processing project data';
      this.loading = false;
      console.error(err);
    }
  }

  buildGanttRows(): void {
    this.ganttRows = [];
    
    if (!this.dateRange) return;

    const storyCodeById = new Map<number, string>();
    this.epics.forEach(epic => {
      epic.userStories?.forEach((story: UserStory) => {
        if (story.storyId != null) {
          storyCodeById.set(story.storyId, story.storyCode);
        }
      });
    });

    this.epics.forEach((epic, epicIndex) => {
      // Add epic row
      const epicRow: GanttRowData = {
        type: 'epic',
        id: epic.epicId,
        name: epic.epicName,
        sequence: epic.epicSequence,
        level: 0,
        isExpanded: this.expandedEpics.has(epic.epicId),
        progress: this.ganttHelper.calculateEpicProgress(epic),
        progressColor: epic.progress?.colorCode || '#4CAF50',
        taskBarStart: 0,
        taskBarWidth: 0
      };

      this.ganttRows.push(epicRow);

      // Add story rows if epic is expanded
      if (epicRow.isExpanded && epic.userStories) {
        epic.userStories.forEach((story: UserStory) => {
          const storyRow: GanttRowData = {
            type: 'story',
            id: story.storyId,
            name: story.title,
            storyCode: story.storyCode,
            sequence: story.storySequence,
            parentEpicId: epic.epicId,
            startDate: story.plannedStartDate ? new Date(story.plannedStartDate) : undefined,
            endDate: story.plannedEndDate ? new Date(story.plannedEndDate) : undefined,
            days: this.ganttHelper.calculateDays(story.plannedStartDate, story.plannedEndDate),
            workDays: this.ganttHelper.calculateWorkDays(story.plannedStartDate, story.plannedEndDate),
            progress: ((story.progress?.progressSequence / (story.maxProgress || 1))*100) || 0,
            progressColor: story.progress?.colorCode || '#2196F3',
            leads: story.leads?.map((lead: any) => lead.company?.companyName).filter(Boolean) || [],
            level: 1,
            isExpanded: false,
            predecessorId: story.predecessorId || undefined,
            predecessorCode: story.predecessorId ? storyCodeById.get(story.predecessorId) : undefined,
            taskBarStart: 0,
            taskBarWidth: 0
          };

          // Calculate task bar position
          if (story.plannedStartDate && story.plannedEndDate) {
            const { start, width } = this.ganttHelper.calculateTaskBarPosition(
                story.plannedStartDate ? new Date(story.plannedStartDate) : new Date(),
                story.plannedEndDate ? new Date(story.plannedEndDate) : new Date(),
                this.dateRange?.startDate ? new Date(this.dateRange.startDate) : new Date(),
                this.dateRange?.endDate ? new Date(this.dateRange.endDate) : new Date(),
                this.dateRange?.days?.length ?? 0
            );
            storyRow.taskBarStart = start;
            storyRow.taskBarWidth = width;
          }

          this.ganttRows.push(storyRow);
        });
      }
    });
  }

  calculateTodayPosition(): void {
    if (!this.dateRange) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeStart = this.dateRange.startDate;
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = this.dateRange.endDate;
    rangeEnd.setHours(0, 0, 0, 0);

    if (today >= rangeStart && today <= rangeEnd) {
      const daysFromStart = this.ganttHelper.calculateDays(
        rangeStart.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ) - 1;
      this.todayPosition = (daysFromStart / this.dateRange.days.length) * 100;
      this.showToday = true;
    } else {
      this.showToday = false;
    }
  }

  toggleEpic(epicId: number): void {
    if (this.expandedEpics.has(epicId)) {
      this.expandedEpics.delete(epicId);
    } else {
      this.expandedEpics.add(epicId);
    }
    this.buildGanttRows();
  }

  getLeadNames(story: UserStory): string {
    if (!story.leads || story.leads.length === 0) {
      return 'Unassigned';
    }
    return story.leads.map((l: any) => l.company?.companyName).filter(Boolean).join(', ');
  }

  getEpicDates(epic: EpicVO): { start: string; end: string } {
    if (!epic.userStories || epic.userStories.length === 0) {
      return { start: 'N/A', end: 'N/A' };
    }

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    epic.userStories.forEach((story: UserStory) => {
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

    return {
      start: minDate ? this.ganttHelper.formatDate(minDate) : 'N/A',
      end: maxDate ? this.ganttHelper.formatDate(maxDate) : 'N/A'
    };
  }

  getEpicStats(epic: EpicVO): { totalStories: number; totalDays: number; totalWorkDays: number } {
    const totalStories = epic.userStories?.length || 0;
    let totalDays = 0;
    let totalWorkDays = 0;

    epic.userStories?.forEach((story: UserStory) => {
      totalDays += this.ganttHelper.calculateDays(story.plannedStartDate, story.plannedEndDate);
      totalWorkDays += this.ganttHelper.calculateWorkDays(story.plannedStartDate, story.plannedEndDate);
    });

    return { totalStories, totalDays, totalWorkDays };
  }

  getEpicStatsForEpicId(epicId: number): { totalStories: number; totalDays: number; totalWorkDays: number } {
    const epic = this.epics.find((item: EpicVO) => item.epicId === epicId);
    return epic ? this.getEpicStats(epic) : { totalStories: 0, totalDays: 0, totalWorkDays: 0 };
  }

  isDayColumn(date: Date): boolean {
    return !this.ganttHelper.isWeekend(date);
  }

  isWeekendColumn(date: Date): boolean {
    return this.ganttHelper.isWeekend(date);
  }

  isTodayColumn(date: Date): boolean {
    return this.ganttHelper.isToday(date);
  }

  getWeekDisplay(): number {
    return Math.min(this.displayWeek, this.totalWeeks);
  }

  nextWeek(): void {
    if (this.displayWeek < this.totalWeeks) {
      this.displayWeek++;
    }
  }

  previousWeek(): void {
    if (this.displayWeek > 1) {
      this.displayWeek--;
    }
  }

  getProgressPercentageText(progress: number): string {
    return Math.round(progress) + '%';
  }

  getTaskTooltip(row: GanttRowData): string {
    const parts = [];
    
    if (row.name) parts.push(`Task: ${row.name}`);
    if (row.startDate) parts.push(`Start: ${this.ganttHelper.formatDate(row.startDate)}`);
    if (row.endDate) parts.push(`End: ${this.ganttHelper.formatDate(row.endDate)}`);
    if (row.days) parts.push(`Days: ${row.days}`);
    if (row.workDays) parts.push(`Work Days: ${row.workDays}`);
    if (row.progress !== undefined) parts.push(`Progress: ${this.getProgressPercentageText(row.progress)}`);
    if (row.leads && row.leads.length > 0) parts.push(`Leads: ${row.leads.join(', ')}`);

    return parts.join(' | ');
  }

  trackByRow(index: number, row: GanttRowData): string {
    return `${row.type}-${row.id}`;
  }

  goBack(): void {
    // this.router.navigate(['/project-builder']);
    this.backClicked.emit();
  }
}
