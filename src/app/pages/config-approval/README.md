# Configuration Approval Page

A modern, responsive Configuration Approval management page built with Angular Material following Microsoft Fluent Design language. This component provides a comprehensive UI for reviewing and managing configuration change approvals.

## Overview

This component displays a dashboard for managing configuration approvals with features including:

- **KPI Dashboard**: Five key metrics showing approval status at a glance
- **Responsive Design**: Fully responsive across desktop, tablet, and mobile devices
- **Approval List**: Scrollable list of configuration change requests with filtering
- **Details Panel**: Detailed view with configuration summary, settings table, and approval tracking
- **Action Buttons**: Approve, Decline, or Request Clarification with remarks
- **Approval Tracking Timeline**: Visual representation of the approval workflow stages
- **Search & Filter**: Filter approvals by status and search by text

## Component Structure

```
config-approval/
├── config-approval.component.ts          # Main component logic
├── config-approval.component.html        # Template
├── config-approval.component.scss        # Styles
├── config-approval.component.spec.ts     # Unit tests
└── approval-dialog/
    ├── approval-dialog.component.ts      # Dialog component for remarks
    ├── approval-dialog.component.html    # Dialog template
    ├── approval-dialog.component.scss    # Dialog styles
    └── approval-dialog.component.spec.ts # Dialog tests
```

## Features

### 1. KPI Cards Section
Displays 5 key performance indicators with metrics and trends:
- **Pending Approvals**: Number of awaiting approvals
- **Approved Today**: Approvals completed today
- **Rejected**: Total rejected approvals
- **Internal Approval**: Approvals requiring internal review
- **BP Approval**: Business partner approvals

### 2. Filter Bar
- **Status Chips**: All, Pending, Approved, Rejected, Internal, BP
- **Search Field**: Search by configuration details or organization name

### 3. Approval List (Left Panel - Desktop)
Each approval card displays:
- Configuration icon
- Title and operation type
- Metadata (Company, User, Date/Time)
- Description
- Status badges (Priority, SLA, Category, etc.)
- Operation type
- Approval type
- Status badge with color coding
- Right arrow indicator

Interactive features:
- Click to select approval
- Hover for elevation and shadow effects
- Blue border on selection

### 4. Details Panel (Right Panel - Desktop)

#### Configuration Summary Section
- Configuration Type
- Operation (Create, Update, Delete)
- Approval Type (Internal, BP)
- Remark
- Created By
- Creator Organization
- Requested Date
- Status Badge

#### Configuration Details Table
Dynamic table showing field changes:
- Field Name
- Current Value
- New Value

#### Approval Tracking Timeline
Visual timeline showing approval workflow stages:
- Draft (initial state)
- Internal Approval (multi-level support)
- Business Partner Approval (multi-level support)
- Activation (final state)

Timeline features:
- Completed stages: Green checkmark
- Current stage: Blue with glow effect
- Rejected: Red indicator
- Connecting lines match stage status

### 5. Action Buttons
Three equal-width buttons:
- **Approve** (Green): Submit approval
- **Decline** (Red): Reject the change
- **Request Clarification** (Blue outline): Ask for more information

### 6. Approval Dialog
Modal dialog for submitting remarks:
- Title matching the action
- Description text
- Textarea with character counter (500 max)
- Cancel and Submit buttons
- Mandatory validation (requires at least one character)

## Responsive Design

### Desktop (≥1024px)
- 2-column layout: 70% list, 30% details
- Side-by-side display
- Full-height scrolling panels

### Tablet (768px - 1023px)
- Single column stacked layout
- List above details
- Full-width components

### Mobile (<768px)
- Single column layout
- Compact spacing and padding
- Stack all sections vertically
- Touch-friendly component sizing

## API Integration

### Service Methods

The component uses `ConfigApprovalService` for API communication:

```typescript
// Get approvals list for a user
getApprovalsList(userId: number): Observable<ConfigChangeApprovalVO[]>

// Approve configuration change
approveConfiguration(approvalId: number, remark?: string): Observable<any>

// Decline configuration change
declineConfiguration(approvalId: number, remark?: string): Observable<any>

// Request clarification
requestClarification(approvalId: number, remark: string): Observable<any>

// Get approval details
getApprovalDetails(approvalId: number): Observable<ConfigChangeApprovalVO>

// Get approval history
getApprovalHistory(approvalId: number): Observable<any>
```

### API Endpoint

Base endpoint: `/bp/config/approval`

Primary list endpoint:
```
GET /bp/config/approval/list/{userId}
```

Response Model: `ConfigChangeApprovalVO[]`

## Data Models

### ConfigChangeApprovalVO
```typescript
{
  approvalId?: number;
  changeRequest?: BPConfigurationChangeRequestVO;
  approvalType?: 'Internal' | 'BP';
  approverLevel?: number;
  approverUserId?: number;
  approverOrgId?: number;
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Draft';
  mandatory?: boolean;
  approvedOn?: string;
  remarks?: BPConfigurationChangeRequestRemarkVO[];
  createdBy?: number;
  createdByName?: string;
  createdOn?: string;
  updatedBy?: number;
  updatedOn?: string;
}
```

### BPConfigurationChangeRequestVO
```typescript
{
  ccrId?: number;
  configuration?: any;
  operation?: 'Create' | 'Update' | 'Delete';
  requestedByOrg?: CompanyMaster;
  requestedByUserId?: number;
  approvalOrg?: CompanyMaster;
  bpPriority?: boolean;
  bpSla?: boolean;
  category?: boolean;
  supportGroup?: boolean;
  assignment?: boolean;
  totalInternalApprovalLevels?: number;
  currentInternalApprovalLevel?: number;
  totalBpApprovalLevels?: number;
  currentBpApprovalLevel?: number;
  createdOn?: string;
  createdBy?: number;
}
```

## Styling

The component uses Microsoft Fluent Design principles:

- **Primary Color**: `#0078D4` (Fluent Blue)
- **Success Color**: `#107C10` (Fluent Green)
- **Error Color**: `#DA3B01` (Fluent Red/Orange)
- **Warning Color**: `#FFB81C` (Fluent Yellow)
- **Typography**: Segoe UI / Inter fonts
- **Spacing**: 4px grid (8px, 12px, 16px, 20px, 24px, 32px)
- **Border Radius**: 4px (buttons), 8px (icons), 12px (cards), 16px (main containers)
- **Shadows**: Subtle elevation shadows (0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.12))
- **Borders**: Very light gray (#E1DFDD) with low opacity

## Usage

### Module Import

Add to `app.module.ts`:

```typescript
import { ConfigApprovalComponent } from './pages/config-approval/config-approval.component';
import { ApprovalDialogComponent } from './pages/config-approval/approval-dialog/approval-dialog.component';
import { ConfigApprovalService } from './service/config-approval.service';

// In declarations array
declarations: [
  ConfigApprovalComponent,
  ApprovalDialogComponent,
  // ...
]

// Material modules (already included)
imports: [
  MatDialogModule,
  MatIconModule,
  MatButtonModule,
  MatFormFieldModule,
  MatInputModule,
  MatChipsModule,
  MatProgressSpinnerModule,
  // ... other Material modules
]
```

### Routing

Add to `app-routing.module.ts`:

```typescript
import { ConfigApprovalComponent } from './pages/config-approval/config-approval.component';

const routes: Routes = [
  {
    path: 'config-approval',
    component: ConfigApprovalComponent,
    canActivate: [authGuard]
  },
  // ...
];
```

### Template Usage

```html
<app-config-approval></app-config-approval>
```

## Component Properties

```typescript
// Data
approvals: ConfigChangeApprovalVO[]          // All loaded approvals
selectedApproval: ConfigChangeApprovalVO     // Currently selected approval
lastRefreshed: Date                          // Last refresh timestamp
isLoading: boolean                           // Loading state

// KPI Cards
kpiCards: KPICard[]                          // Array of KPI card data

// Filter state
filterStatus: string                         // Currently selected filter
filterStatuses: string[]                     // Available filter options
searchText: string                           // Search filter text

// Responsive
isMobile: boolean                            // Mobile screen detection
isTablet: boolean                            // Tablet screen detection
```

## Component Methods

```typescript
// Data Loading
loadApprovals(): void                        // Fetch approvals from API
calculateKPIs(): void                        // Calculate KPI metrics

// Filtering
filterApprovals(): ConfigChangeApprovalVO[]  // Get filtered approval list
setFilterStatus(status: string): void        // Update filter status

// Selection & Interaction
selectApproval(approval): void               // Select an approval
openApprovalDialog(action): void             // Open action dialog
submitApprovalAction(action, remark): void   // Submit approval action
refresh(): void                              // Refresh data from API

// Utility Methods
getStatusChips(approval): string[]           // Get status chips array
getOperationLabel(operation): string         // Format operation text
getApprovalTypeLabel(type): string[]         // Format approval type
getApprovalStatusColor(status): string       // Get status color
getFormattedDate(date): string               // Format date/time
getApprovalTrackingStages(approval): any[]   // Get timeline stages
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Accessibility

- ARIA labels on chips and buttons
- Semantic HTML structure
- Keyboard navigation support
- Focus indicators
- Color contrast WCAG AA compliant

## Performance

- Lazy loading for large approval lists
- Virtual scrolling ready (can be implemented with CDK)
- Efficient change detection
- Memoized KPI calculations
- Minimal re-renders

## Testing

Unit tests included for:
- Component initialization
- Data loading and filtering
- KPI calculations
- Approval selection
- Dialog interactions
- Responsive behavior

Run tests:
```bash
ng test
```

## Customization

### Colors
Edit SCSS variables in `config-approval.component.scss`:
```scss
$primary-blue: #0078D4;
$success-green: #107C10;
$error-red: #DA3B01;
// ... more colors
```

### Responsive Breakpoints
Modify media queries in SCSS:
```scss
@media (max-width: 1024px) { ... }  // Tablet
@media (max-width: 768px) { ... }   // Mobile
@media (max-width: 480px) { ... }   // Small mobile
```

### KPI Cards
Customize in `calculateKPIs()` method:
```typescript
this.kpiCards = [
  {
    title: 'Custom Title',
    count: customCount,
    trend: 'Custom trend text',
    icon: 'material-icon-name',
    color: '#CUSTOM_COLOR'
  },
  // ...
];
```

## Troubleshooting

### Approvals not loading
- Verify API endpoint is correct: `/bp/config/approval/list/{userId}`
- Check user authentication and interceptor
- Verify response model matches `ConfigChangeApprovalVO`

### Dialog not appearing
- Ensure `ApprovalDialogComponent` is declared in module
- Check `MatDialogModule` is imported
- Verify dialog data is passed correctly

### Responsive layout not working
- Verify viewport meta tag in `index.html`
- Check browser viewport width
- Clear browser cache and rebuild

### Styling issues
- Ensure Material theme is imported in `styles.scss`
- Verify Material icons are loaded
- Check for CSS specificity conflicts

## Future Enhancements

- [ ] Virtual scrolling for large lists (CDK Virtual Scroll)
- [ ] Batch actions for multiple approvals
- [ ] Export/Download approval reports
- [ ] Advanced filtering (date range, priority, etc.)
- [ ] Approval templates
- [ ] Audit trail view
- [ ] Real-time updates (WebSocket)
- [ ] Email notifications
- [ ] Multi-language support

## License

This component is part of the Flickzz Desk UI application.

## Support

For issues or questions, contact the development team or refer to the project documentation.
