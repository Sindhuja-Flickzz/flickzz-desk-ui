import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfigApprovalService } from '../../service/config-approval.service';
import { ApprovalDialogComponent } from './approval-dialog/approval-dialog.component';
import { ConfigChangeApprovalVO, BPConfigurationChangeRequestVO } from '../../models/config-change-approval.model';

interface KPICard {
  title: string;
  count: number;
  trend: string;
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
  lastRefreshed: Date = new Date();
  isLoading = false;
  errorMessage = '';

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
    const userId = this.getCurrentUserId();

    this.configApprovalService.getApprovalsList(userId).subscribe({
      next: (data: ConfigChangeApprovalVO[]) => {
        this.approvals = data || [];
        this.calculateKPIs();
        this.lastRefreshed = new Date();
        this.isLoading = false;
        this.selectedApproval = this.approvals.length > 0 ? this.approvals[0] : null;
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
    const total = this.approvals.length;
    const pending = this.approvals.filter(a => a.status === 'Pending').length;
    const approved = this.approvals.filter(a => a.status === 'Approved' && this.isToday(a.approvedOn)).length;
    const rejected = this.approvals.filter(a => a.status === 'Rejected').length;
    const internal = this.approvals.filter(a => a.approvalType === 'Internal').length;
    const bp = this.approvals.filter(a => a.approvalType === 'BP').length;

    this.kpiCards = [
      {
        title: 'Pending Approvals',
        count: pending,
        trend: '↓ 3% vs last week',
        icon: 'schedule',
        color: '#FFB81C'
      },
      {
        title: 'Approved Today',
        count: approved,
        trend: '↑ 2% vs last week',
        icon: 'check_circle',
        color: '#107C10'
      },
      {
        title: 'Rejected',
        count: rejected,
        trend: '↓ 1% vs last week',
        icon: 'cancel',
        color: '#DA3B01'
      },
      {
        title: 'Internal Approval',
        count: internal,
        trend: '→ 0% vs last week',
        icon: 'group',
        color: '#0078D4'
      },
      {
        title: 'BP Approval',
        count: bp,
        trend: '→ 0% vs last week',
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
        filtered = filtered.filter(a => a.approvalType === this.filterStatus);
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

  selectApproval(approval: ConfigChangeApprovalVO): void {
    this.selectedApproval = approval;
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
    // TODO: Call service to submit approval action
    console.log('Submitted:', action, remark);
    this.loadApprovals();
  }

  private getCurrentUserId(): number {
    // TODO: Get from authentication service
    return 1;
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
    const cr = approval.changeRequest;
    return [
      {
        stage: 'Draft',
        completed: approval.status !== 'Draft',
        current: approval.status === 'Draft',
        rejected: false
      },
      {
        stage: 'Internal Approval',
        completed: cr?.currentInternalApprovalLevel! > (cr?.totalInternalApprovalLevels || 0),
        current: cr?.currentInternalApprovalLevel !== undefined && cr?.currentInternalApprovalLevel <= (cr?.totalInternalApprovalLevels || 0),
        rejected: approval.status === 'Rejected' && approval.approvalType === 'Internal'
      },
      {
        stage: 'Business Partner Approval',
        completed: cr?.currentBpApprovalLevel! > (cr?.totalBpApprovalLevels || 0),
        current: cr?.currentBpApprovalLevel !== undefined && cr?.currentBpApprovalLevel <= (cr?.totalBpApprovalLevels || 0),
        rejected: approval.status === 'Rejected' && approval.approvalType === 'BP'
      },
      {
        stage: 'Activation',
        completed: approval.status === 'Approved',
        current: false,
        rejected: false
      }
    ];
  }
}
