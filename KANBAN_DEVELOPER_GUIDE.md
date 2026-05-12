# Kanban Board - Developer Reference

## Implementation Examples

### 1. Using the Kanban Board Component

```typescript
// In your component template
<app-kanban-board [project]="selectedProject"></app-kanban-board>

// In your component TypeScript
import { ProjectVO } from './models/project-builder';
import { KanbanBoardComponent } from './pages/project-builder/kanban-board/kanban-board.component';

export class YourComponent {
  selectedProject: ProjectVO;
  
  onViewKanban(project: ProjectVO) {
    this.selectedProject = project;
  }
}
```

### 2. API Integration Examples

#### Get Project with Full Details (Including User Stories)

```typescript
// Request
GET /project/{projectId}

// Response
{
  "projectId": 1,
  "projectName": "FlickzzDesk",
  "company": {
    "companyId": 1,
    "companyName": "Flickzz Tech"
  },
  "plannedStartDate": "2026-05-01",
  "plannedEndDate": "2026-08-31",
  "epics": [
    {
      "epicId": 1,
      "epicName": "User Authentication",
      "epicSequence": 1,
      "userStories": [
        {
          "storyId": 101,
          "storyCode": "AUTH-001",
          "title": "Implement Login Page",
          "description": "Create login form with validation",
          "progress": {
            "progressId": 2,
            "progressName": "In Development",
            "progressSequence": 2,
            "colorCode": "FF9800"
          },
          "plannedStartDate": "2026-05-05",
          "plannedEndDate": "2026-05-12",
          "leads": [
            {
              "company": {
                "companyId": 10,
                "companyName": "Dev Team"
              }
            }
          ],
          "storyPoints": 5
        }
      ]
    }
  ]
}
```

#### Update Story Status (Move Between Columns)

```typescript
// Request
PUT /user-story/101/status
Content-Type: application/json

{
  "progressId": 3
}

// Response
{
  "success": true,
  "message": "Story status updated",
  "data": {
    "storyId": 101,
    "progressId": 3,
    "updatedAt": "2026-05-12T10:30:00Z"
  }
}
```

#### Reorder Story (Change Sequence Within Column)

```typescript
// Request
PUT /user-story/101/reorder
Content-Type: application/json

{
  "progressId": 2,
  "storySequence": 3
}

// Response
{
  "success": true,
  "message": "Story reordered successfully",
  "data": {
    "storyId": 101,
    "progressId": 2,
    "storySequence": 3,
    "updatedAt": "2026-05-12T10:31:00Z"
  }
}
```

### 3. Component Lifecycle

```typescript
ngOnInit() {
  // 1. Receive project input
  // 2. Initialize board
  this.initializeBoard();
}

private initializeBoard() {
  // 1. Extract all tasks from epics
  this.extractAllTasks();
  
  // 2. Build columns from unique statuses
  this.buildColumns();
  
  // 3. Extract filter options
  this.extractFilterOptions();
  
  // 4. Apply filters (initial state)
  this.applyFilters();
}
```

### 4. Filtering Logic

```typescript
applyFilters(): void {
  let filtered = [...this.allTasks];
  
  // Search filter
  if (this.filters.searchText) {
    const searchLower = this.filters.searchText.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(searchLower) ||
      t.storyCode.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Epic filter
  if (this.filters.selectedEpic) {
    filtered = filtered.filter(t => t.epicName === this.filters.selectedEpic);
  }
  
  // Lead filter
  if (this.filters.selectedLead) {
    filtered = filtered.filter(t =>
      t.leads?.some(l => l.companyId === this.filters.selectedLead)
    );
  }
  
  // Status filter
  if (this.filters.selectedStatus) {
    filtered = filtered.filter(t => t.progressId === this.filters.selectedStatus);
  }
  
  // Overdue filter
  if (this.filters.showOverdue) {
    const today = new Date();
    filtered = filtered.filter(t => {
      if (t.plannedEndDate) {
        const endDate = new Date(t.plannedEndDate);
        return endDate < today && t.progressId !== this.getCompletedStatusId();
      }
      return false;
    });
  }
  
  // Update filtered tasks map
  this.filteredTasks.clear();
  this.columns.forEach(col => {
    const colTasks = filtered.filter(t => t.progressId === col.progressId);
    this.filteredTasks.set(col.progressId, colTasks);
  });
}
```

### 5. Drag and Drop Handler

```typescript
drop(event: CdkDragDrop<KanbanTask[]>, targetColumnId: number): void {
  const task = event.item.data as KanbanTask;
  
  // Check if moving to different column
  if (event.previousContainer === event.container) {
    // Reorder within same column
    this.reorderTaskInColumn(targetColumnId, event.previousIndex, event.currentIndex);
  } else {
    // Move between columns
    this.moveTaskBetweenColumns(task, targetColumnId, event.currentIndex);
  }
}

private moveTaskBetweenColumns(
  task: KanbanTask,
  newProgressId: number,
  newIndex: number
): void {
  const oldProgressId = task.progressId;
  
  // Update local state first (optimistic update)
  const oldTasks = this.filteredTasks.get(oldProgressId);
  if (oldTasks) {
    const index = oldTasks.indexOf(task);
    if (index > -1) {
      oldTasks.splice(index, 1);
    }
  }
  
  task.progressId = newProgressId;
  const newTasks = this.filteredTasks.get(newProgressId) || [];
  newTasks.splice(newIndex, 0, task);
  this.filteredTasks.set(newProgressId, newTasks);
  
  // Call backend to persist
  this.projectService
    .updateStoryStatus(task.storyId, { progressId: newProgressId })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      error: (err) => {
        console.error('Failed to update:', err);
        // Optionally roll back changes here
        this.initializeBoard(); // Refresh
      }
    });
}
```

### 6. Custom Styling Example

```scss
// Change column header color
.kanban-column {
  border-top-color: var(--status-color);
  
  &.critical {
    border-top-color: #ef5350;
  }
  
  &.completed {
    opacity: 0.8;
  }
}

// Custom card styling
.task-card {
  &.urgent {
    border-left: 4px solid #ef5350;
  }
  
  &.blocked {
    background: #ffebee;
  }
}
```

### 7. Performance Optimization - TrackBy Functions

```typescript
// In component
trackByStoryId(index: number, task: KanbanTask): number {
  return task.storyId;
}

trackByColumnId(index: number, column: KanbanColumn): number {
  return column.progressId;
}

// In template
<div *ngFor="let task of tasks; trackBy: trackByStoryId">
  <!-- task content -->
</div>
```

### 8. Error Handling Pattern

```typescript
private initializeBoard(): void {
  if (!this.project?.epics) {
    return;
  }

  try {
    this.extractAllTasks();
    this.buildColumns();
    this.extractFilterOptions();
    this.applyFilters();
  } catch (err) {
    this.error = 'Failed to initialize Kanban board';
    console.error(err);
    // Show error message to user
  }
}
```

## Advanced Customization

### 1. Adding Custom Filters

```typescript
// Extend KanbanFilters interface
export interface CustomKanbanFilters extends KanbanFilters {
  assignedToMe?: boolean;
  startDateFrom?: string;
  startDateTo?: string;
}

// Add filter handler
private applyCustomFilters(filtered: KanbanTask[]): KanbanTask[] {
  if (this.customFilters.assignedToMe) {
    const currentUserId = this.getCurrentUserId();
    filtered = filtered.filter(t =>
      t.leads?.some(l => l.companyId === currentUserId)
    );
  }
  
  if (this.customFilters.startDateFrom) {
    const fromDate = new Date(this.customFilters.startDateFrom);
    filtered = filtered.filter(t => {
      const startDate = new Date(t.plannedStartDate || '');
      return startDate >= fromDate;
    });
  }
  
  return filtered;
}
```

### 2. Adding Bulk Actions

```typescript
selectedTasks: Set<number> = new Set();

toggleTaskSelection(task: KanbanTask): void {
  if (this.selectedTasks.has(task.storyId)) {
    this.selectedTasks.delete(task.storyId);
  } else {
    this.selectedTasks.add(task.storyId);
  }
}

bulkUpdateStatus(newProgressId: number): void {
  const updates = Array.from(this.selectedTasks).map(storyId =>
    this.projectService.updateStoryStatus(storyId, {
      progressId: newProgressId
    })
  );
  
  forkJoin(updates).subscribe({
    next: () => {
      this.initializeBoard();
      this.selectedTasks.clear();
    },
    error: (err) => console.error(err)
  });
}
```

### 3. Adding Real-time Updates

```typescript
// Using WebSocket
private setupRealtimeUpdates(): void {
  this.webSocketService.onMessage('task-updated').subscribe(event => {
    const updatedTask = event.data;
    // Update local state
    const taskIndex = this.allTasks.findIndex(t => t.storyId === updatedTask.storyId);
    if (taskIndex !== -1) {
      this.allTasks[taskIndex] = updatedTask;
      this.applyFilters();
    }
  });
}
```

### 4. Adding Custom Calculations

```typescript
// Calculate epic progress
getEpicProgress(epicName: string): number {
  const epicTasks = this.allTasks.filter(t => t.epicName === epicName);
  if (epicTasks.length === 0) return 0;
  
  const completedStatusId = this.getCompletedStatusId();
  const completedCount = epicTasks.filter(t => t.progressId === completedStatusId).length;
  
  return (completedCount / epicTasks.length) * 100;
}

// Calculate team velocity
getTeamVelocity(leadId: number): number {
  const leadTasks = this.allTasks.filter(t =>
    t.leads?.some(l => l.companyId === leadId)
  );
  return leadTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
}
```

## Testing Examples

### Unit Test

```typescript
describe('KanbanBoardComponent', () => {
  let component: KanbanBoardComponent;
  let projectService: ProjectService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [KanbanBoardComponent],
      providers: [ProjectService]
    });
    component = TestBed.createComponent(KanbanBoardComponent).componentInstance;
    projectService = TestBed.inject(ProjectService);
  });
  
  it('should initialize board', () => {
    const mockProject = { epics: [] };
    component.project = mockProject;
    component.ngOnInit();
    expect(component.columns).toBeDefined();
  });
  
  it('should filter tasks by search', () => {
    component.allTasks = [
      { storyId: 1, title: 'Login', description: '' }
    ];
    component.filters.searchText = 'Login';
    component.applyFilters();
    expect(component.filteredTasks.size).toBeGreaterThan(0);
  });
});
```

## Performance Metrics

Recommended targets:
- Initial load: < 2s
- Filter apply: < 500ms
- Drag-drop: 60 FPS
- Search: < 100ms
- Memory: < 50MB for 1000 tasks

## Security Considerations

1. **Input Validation**: All user inputs sanitized
2. **API Security**: JWT tokens in headers
3. **CORS**: Properly configured
4. **XSS Prevention**: Angular's built-in sanitization
5. **CSRF Protection**: Token-based

---

**Version**: 1.0  
**Last Updated**: May 12, 2026
