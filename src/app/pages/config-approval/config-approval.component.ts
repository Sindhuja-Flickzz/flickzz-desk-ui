import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigApprovalService } from '../../service/config-approval.service';
import { PriorityService } from '../../service/priority.service';
import { SlaService } from '../../service/sla.service';
import { CategoryService } from '../../service/category.service';
import { SupportGroupService } from '../../service/support-group.service';
import { SupportCategoryService } from '../../service/support-category.service';
import { AuthenticationService } from '../../service/authentication.service';
import { ApprovalDialogComponent } from './approval-dialog/approval-dialog.component';
import { BPConfigurationChangeRequestRemarkVO, ConfigChangeApprovalVO } from '../../models/config-change-approval.model';
import { UserVO } from '../../models/user-vo';
import { USER_ROLES } from '../../data/app_constants';  

interface KPICard {
  title: string;
  count: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-config-approval',
  templateUrl: './config-approval.component.html',
  styleUrls: ['./config-approval.component.scss']
})
export class ConfigApprovalComponent implements OnInit {
  @ViewChild('scrollableList') scrollableList: any;

  // Data
  approvals: ConfigChangeApprovalVO[] = [];
  selectedApproval: ConfigChangeApprovalVO | null = null;
  selectedApprovalCurrent: any | null = null;
  selectedApprovalUpdated: any | null = null;
  selectedApprovalTrackingStages: any[] = [];
  selectedApprovalRemarks: BPConfigurationChangeRequestRemarkVO[] = [];
  remarkUserNames: Record<number, string> = {};
  detailsVisible = false;
  lastRefreshed: Date = new Date();
  isLoading = false;
  isDetailLoading = false;
  errorMessage = '';
  detailLoadError = '';

  // KPI Cards
  kpiCards: KPICard[] = [];

  // Filter state
  filterStatus = 'All';
  filterStatuses = ['All', 'Pending', 'Approved', 'Rejected', 'Internal', 'BP'];
  searchText = '';

  // Responsive
  isMobile = false;
  isTablet = false;

  constructor(
    private configApprovalService: ConfigApprovalService,
    private priorityService: PriorityService,
    private slaService: SlaService,
    private categoryService: CategoryService,
    private supportGroupService: SupportGroupService,
    private supportCategoryService: SupportCategoryService,
    private authService: AuthenticationService,
    private dialog: MatDialog
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.loadApprovals();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  loadApprovals(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const userId = Number(localStorage.getItem('userId')); // Default to 1 if not found

    this.configApprovalService.getApprovalsList(userId).subscribe({
      next: (data: ConfigChangeApprovalVO[]) => {
        this.approvals = (data as any).attributes || [];
        this.populateApprovalCreatorNames();
        this.calculateKPIs();
        this.lastRefreshed = new Date();
        this.isLoading = false;
        this.detailsVisible = false;
        this.selectedApproval = null;
        this.selectedApprovalCurrent = null;
        this.selectedApprovalUpdated = null;
        this.selectedApprovalTrackingStages = [];
      },
      error: (error) => {
        console.error('Error loading approvals:', error);
        this.isLoading = false;
        this.approvals = [];
        this.kpiCards = [];
        this.selectedApproval = null;
        this.errorMessage = 'Unable to load approval requests right now. Please try again shortly.';
      }
    });
  }

  calculateKPIs(): void {
    console.log('Calculating KPIs for approvals:', this.approvals);
    const total = this.approvals.length;
    const pending = this.approvals.filter(a => a.status === 'Pending').length;
    const approved = this.approvals.filter(a => a.status === 'Approved').length;
    const requested_clarification = this.approvals.filter(a => a.status === 'Requested Clarification').length;
    const rejected = this.approvals.filter(a => a.status === 'Rejected').length;
    const internal = this.approvals.filter(a => this.getApprovalType(a) === 'Internal').length;
    const bp = this.approvals.filter(a => this.getApprovalType(a) === 'BP').length;

    this.kpiCards = [
      {
        title: 'Pending Approvals',
        count: pending,
        icon: 'schedule',
        color: '#FFB81C'
      },
      {
        title: 'Approved',
        count: approved,
        icon: 'check_circle',
        color: '#107C10'
      },
      {
        title: 'Requested Clarification',
        count: requested_clarification,
        icon: 'help_outline',
        color: '#FFB81C'
      },
      {
        title: 'Rejected',
        count: rejected,
        icon: 'cancel',
        color: '#DA3B01'
      },
      {
        title: 'Internal Approval',
        count: internal,
        icon: 'group',
        color: '#0078D4'
      },
      {
        title: 'BP Approval',
        count: bp,
        icon: 'business',
        color: '#8661C5'
      }
    ];
  }

  isToday(date: string | null | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  }

  filterApprovals(): ConfigChangeApprovalVO[] {
    let filtered = this.approvals;

    // Filter by status
    if (this.filterStatus !== 'All') {
      if (this.filterStatus === 'Internal' || this.filterStatus === 'BP') {
        filtered = filtered.filter(a => this.getApprovalType(a) === this.filterStatus);
      } else {
        filtered = filtered.filter(a => a.status === this.filterStatus);
      }
    }

    // Filter by search text
    if (this.searchText.trim()) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(a =>
        (a.changeRequest?.configuration?.toString().toLowerCase().includes(searchLower)) ||
        (a.changeRequest?.requestedByOrg?.companyName?.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }

  getConfigName(approval: ConfigChangeApprovalVO): string {
    return approval.changeRequest?.bpPriority ? 'Priority' : approval.changeRequest?.bpSla ? 'SLA' : approval.changeRequest?.category ? 'Category' : approval.changeRequest?.supportGroup ? 'Support Group' : approval.changeRequest?.assignment ? 'Assignment' : 'Configuration';
  }

  getApprovalTitle(approval: ConfigChangeApprovalVO): string {
    const configType = this.getConfigName(approval);
    const operation = this.getOperationLabel(approval.changeRequest?.operation);
    return `${configType} - ${operation}`;
  }

  getConfigIcon(approval: ConfigChangeApprovalVO): string {
    const configName = this.getConfigName(approval);
    switch (configName) {
      case 'Priority':
        return 'speed';
      case 'SLA':
        return 'timer';
      case 'Category':
        return 'category';
      case 'Support Group':
        return 'groups';
      case 'Assignment':
        return 'assignment_ind';
      default:
        return 'settings';
    }
  }

  getApprovalType(approval: ConfigChangeApprovalVO): string {
    return approval.approverType || '';
  }

  selectApproval(approval: ConfigChangeApprovalVO): void {
    this.detailsVisible = true;
    this.selectedApprovalRemarks = [];
    this.loadApprovalDetails(approval);
    this.loadApprovalRemarks(approval.approvalId);
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.selectedApproval = null;
    this.selectedApprovalCurrent = null;
    this.selectedApprovalUpdated = null;
    this.selectedApprovalTrackingStages = [];
    this.selectedApprovalRemarks = [];
    this.detailLoadError = '';
  }

  private populateApprovalCreatorNames(): void {
    const creatorIds = Array.from(new Set(
      this.approvals
        .filter(approval => approval.createdBy != null && !approval.createdByName)
        .map(approval => approval.createdBy as number)
    ));

    if (!creatorIds.length) {
      return;
    }

    const userRequests = creatorIds.map(userId =>
      this.authService.getUserInfoById(userId).pipe(
        map(response => ({
          userId,
          user: (response as any).attributes as UserVO
        }))
      )
    );

    forkJoin(userRequests).subscribe({
      next: results => {
        const userMap = new Map<number, UserVO>(
          results.map(result => [result.userId, result.user])
        );

        this.approvals = this.approvals.map(approval => {
          if (approval.createdBy && !approval.createdByName) {
            const user = userMap.get(approval.createdBy);
            if (user) {
              approval.createdByName = this.getUserDisplayName(user);
            }
          }
          return approval;
        });
      },
      error: error => {
        console.warn('Unable to resolve approval creator names:', error);
      }
    });
  }

  private getUserDisplayName(user: UserVO): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.userName || user.registerId || 'Unknown User';
  }

  private loadApprovalRemarks(approvalId?: number): void {
    if (!approvalId) {
      this.selectedApprovalRemarks = [];
      return;
    }

    this.configApprovalService.getApprovalRemarks(approvalId).subscribe({
      next: (remarks) => {
        this.selectedApprovalRemarks = (remarks as any).attributes || [];
        this.populateRemarkUserNames(this.selectedApprovalRemarks);
      },
      error: (error) => {
        console.warn('Unable to load approval remarks:', error);
        this.selectedApprovalRemarks = [];
      }
    });
  }

  private populateRemarkUserNames(remarks: BPConfigurationChangeRequestRemarkVO[]): void {
    const userIds = Array.from(new Set(
      remarks
        .filter(remark => remark.userId != null)
        .map(remark => remark.userId as number)
    ));

    if (!userIds.length) {
      return;
    }

    const userRequests = userIds.map(userId =>
      this.authService.getUserInfoById(userId).pipe(
        map(response => ({
          userId,
          user: (response as any).attributes as UserVO
        }))
      )
    );

    forkJoin(userRequests).subscribe({
      next: (results) => {
        this.remarkUserNames = results.reduce((map, result) => {
          map[result.userId] = this.getUserDisplayName(result.user);
          return map;
        }, {} as Record<number, string>);
      },
      error: (error) => {
        console.warn('Unable to resolve remark authors:', error);
      }
    });
  }

  getRemarkAuthor(remark: BPConfigurationChangeRequestRemarkVO): string {
    if (remark.userId != null) {
      return this.remarkUserNames[remark.userId] || 'Unknown';
    }
    return 'Unknown';
  }

  getRemarkLevelText(remark: BPConfigurationChangeRequestRemarkVO): string {
    if(remark.remarkType != null) {
      return remark.remarkType.toUpperCase();
    }
    return 'Unknown';
  }

  getSubCategoryNames(subCategories: any[] | undefined): string {
    if (!subCategories || !Array.isArray(subCategories) || subCategories.length === 0) {
      return '';
    }

    return subCategories
      .map(sub => sub?.subCategoryName)
      .filter(Boolean)
      .join(', ');
  }

  getSupportGroupManagerNames(groups: any[] | undefined): string {
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return '';
    }

    return groups
      .map(group => group?.agent?.agentName || '')
      .filter(Boolean)
      .join(', ');
  }

  getSupportGroupMemberNames(members: any[] | undefined): string {
    if (!members || !Array.isArray(members) || members.length === 0) {
      return '';
    }
    return members
      .map(member => member?.agent?.agentName || member?.memberName || member?.name || '')
      .filter(Boolean)
      .join(', ');
  }

  loadApprovalDetails(approval: ConfigChangeApprovalVO): void {
    this.selectedApproval = approval;
    this.selectedApprovalCurrent = null;
    this.selectedApprovalUpdated = null;
    this.detailLoadError = '';
    this.selectedApprovalTrackingStages = this.getApprovalTrackingStages(approval);

    const configName = this.getConfigName(approval).toLowerCase();
    const changedId = approval.changeRequest?.changedRequestId;
    const sourceId = approval.changeRequest?.sourceChangeId;
    const operation = approval.changeRequest?.operation?.toLowerCase();

    if (!changedId) {
      this.selectedApprovalUpdated = null;
      this.selectedApprovalCurrent = null;
      return;
    }

    this.isDetailLoading = true;

    if (configName === 'priority') {
      const updated$ = this.priorityService.getPriorityById(changedId);
      const current$ = (operation === 'update' || operation === 'delete') && sourceId
        ? this.priorityService.getPriorityById(sourceId)
        : of(null);

      forkJoin([updated$, current$]).subscribe({
        next: ([updated, current]) => {
          this.selectedApprovalUpdated = updated ? (updated as any).attributes : null;
          this.selectedApprovalCurrent = current ? (current as any).attributes : null;
          this.isDetailLoading = false;
        },
        error: (error) => {
          console.error('Error loading priority details:', error);
          this.detailLoadError = 'Unable to load configuration details right now.';
          this.isDetailLoading = false;
        }
      });
    } else if (configName === 'sla') {
      const updated$ = this.slaService.getSlaById(changedId);
      const current$ = (operation === 'update' || operation === 'delete') && sourceId
        ? this.slaService.getSlaById(sourceId)
        : of(null);

      forkJoin([updated$, current$]).subscribe({
        next: ([updated, current]) => {
          this.selectedApprovalUpdated = updated ? (updated as any).attributes || updated : null;
          this.selectedApprovalCurrent = current ? (current as any).attributes || current : null;
          this.isDetailLoading = false;
        },
        error: (error) => {
          console.error('Error loading SLA details:', error);
          this.detailLoadError = 'Unable to load configuration details right now.';
          this.isDetailLoading = false;
        }
      });
    } else if (configName === 'category') {
      const updated$ = this.categoryService.getCategoryById(changedId);
      const current$ = (operation === 'update' || operation === 'delete') && sourceId
        ? this.categoryService.getCategoryById(sourceId)
        : of(null);

      forkJoin([updated$, current$]).subscribe({
        next: ([updated, current]) => {
          this.selectedApprovalUpdated = updated ? (updated as any).attributes || updated : null;
          this.selectedApprovalCurrent = current ? (current as any).attributes || current : null;
          this.isDetailLoading = false;
        },
        error: (error) => {
          console.error('Error loading category details:', error);
          this.detailLoadError = 'Unable to load configuration details right now.';
          this.isDetailLoading = false;
        }
      });
    } else if (configName === 'support group') {
      const updated$ = this.supportGroupService.getSupportGroupById(changedId);
      const current$ = (operation === 'update' || operation === 'delete') && sourceId
        ? this.supportGroupService.getSupportGroupById(sourceId)
        : of(null);

      forkJoin([updated$, current$]).subscribe({
        next: ([updated, current]) => {
          this.selectedApprovalUpdated = updated ? (updated as any).attributes || updated : null;
          this.selectedApprovalCurrent = current ? (current as any).attributes || current : null;
          this.isDetailLoading = false;
        },
        error: (error) => {
          console.error('Error loading support group details:', error);
          this.detailLoadError = 'Unable to load configuration details right now.';
          this.isDetailLoading = false;
        }
      });
    } else if (configName === 'assignment') {
      const updated$ = this.supportCategoryService.getAssignmentById(changedId);
      const current$ = (operation === 'update' || operation === 'delete') && sourceId
        ? this.supportCategoryService.getAssignmentById(sourceId)
        : of(null);

      forkJoin([updated$, current$]).subscribe({
        next: ([updated, current]) => {
          this.selectedApprovalUpdated = updated ? (updated as any).attributes || updated : null;
          this.selectedApprovalCurrent = current ? (current as any).attributes || current : null;
          this.isDetailLoading = false;
        },
        error: (error) => {
          console.error('Error loading assignment details:', error);
          this.detailLoadError = 'Unable to load configuration details right now.';
          this.isDetailLoading = false;
        }
      });
    } else {
      this.selectedApprovalUpdated = null;
      this.selectedApprovalCurrent = null;
      this.isDetailLoading = false;
    }
  }

  setFilterStatus(status: string): void {
    this.filterStatus = status;
  }

  refresh(): void {
    this.loadApprovals();
  }

  getStatusChips(approval: ConfigChangeApprovalVO): string[] {
    const chips = [];
    if (approval.changeRequest?.bpPriority) chips.push('Priority');
    if (approval.changeRequest?.bpSla) chips.push('SLA');
    if (approval.changeRequest?.category) chips.push('Category');
    if (approval.changeRequest?.supportGroup) chips.push('Support Group');
    if (approval.changeRequest?.assignment) chips.push('Assignment');
    return chips;
  }

  getOperationLabel(operation: string | undefined): string {
    return operation || 'Update';
  }

  getApprovalTypeLabel(approvalType: string | undefined): string[] {
    return approvalType ? [approvalType] : [];
  }

  getApprovalStatusColor(status: string | undefined): string {
    switch (status) {
      case 'Pending':
        return '#FFB81C';
      case 'Approved':
        return '#107C10';
      case 'Rejected':
        return '#DA3B01';
      case 'Draft':
        return '#737373';
      case 'Suspended':
        return '#FFB81C';
      default:
        return '#737373';
    }
  }

  openApprovalDialog(action: 'approve' | 'decline' | 'clarify'): void {
    if (!this.selectedApproval) return;

    const dialogRef = this.dialog.open(ApprovalDialogComponent, {
      width: '500px',
      data: {
        approval: this.selectedApproval,
        action: action
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submitApprovalAction(action, result.remark);
      }
    });
  }

  submitApprovalAction(action: string, remark: string): void {
    if (!this.selectedApproval?.approvalId) return;

    const approvalActionData = {
      approvalId: this.selectedApproval.approvalId,
      action,
      remarks: remark,
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };
    console.log('Submitting approval action data:', action);

    let request$;
    request$ = this.configApprovalService.applyAction(approvalActionData);
    // if (action === 'approve') {
    //   request$ = this.configApprovalService.approveConfiguration(approvalActionData);
    // } else if (action === 'decline') {
    //   request$ = this.configApprovalService.declineConfiguration(approvalActionData);
    // } else {
    //   request$ = this.configApprovalService.requestClarification(approvalActionData);
    // }

    request$.subscribe({
      next: () => {
        this.loadApprovals();
      },
      error: (error) => {
        console.error(`Error submitting ${action}:`, error);
      }
    });
  }

  getFormattedDate(date: string | null | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getApprovalTrackingStages(approval: ConfigChangeApprovalVO): any[] {
    const status = approval.status;
    const request = approval.changeRequest;
    const isDraft = status === 'Draft';
    const isRejected = status === 'Rejected';
    const internalCompleted = !!request?.internalApprovalCompleted;
    const bpCompleted = !!request?.bpApprovalCompleted;
    const hasBpStage = request?.changedRequestId != null && request?.sourceChangeId != null && request.changedRequestId !== request.sourceChangeId;
    const allPreviousCompleted = internalCompleted && (!hasBpStage || bpCompleted);

    const stages: any[] = [
      {
        stage: 'Draft',
        completed: !isDraft,
        current: isDraft,
        rejected: isRejected
      },
      {
        stage: 'Internal',
        completed: internalCompleted,
        current: !isDraft && !internalCompleted && !isRejected,
        rejected: isRejected
      }
    ];

    if (hasBpStage) {
      stages.push({
        stage: 'BP',
        completed: bpCompleted,
        current: !isDraft && internalCompleted && !bpCompleted && !isRejected,
        rejected: isRejected
      });
    }

    stages.push({
      stage: 'Activation',
      completed: request?.status === 'Approved',
      current: !isDraft && allPreviousCompleted && status !== 'Approved' && !isRejected,
      rejected: isRejected
    });

    return stages;
  }
}
