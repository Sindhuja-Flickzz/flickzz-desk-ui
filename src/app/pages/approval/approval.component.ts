import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin, Observable, of } from 'rxjs';
import { ApprovalRecord, BusinessPartnerChangeRequest, RitmApprover } from '../../models/approval.model';
import { ConfigApprovalService } from '../../service/config-approval.service';
import { PriorityService } from '../../service/priority.service';
import { SlaService } from '../../service/sla.service';
import { CategoryService } from '../../service/category.service';
import { SupportGroupService } from '../../service/support-group.service';
import { SupportCategoryService } from '../../service/support-category.service';
import { AuthenticationService } from '../../service/authentication.service';
import { RitmService } from '../../service/ritm.service';
import { UserVO } from '../../models/user-vo';
import { ApprovalDialogComponent } from '../config-approval/approval-dialog/approval-dialog.component';
import { USER_ROLES } from '../../data/app_constants';
import { catchError, map } from 'rxjs/operators';

interface ConfigurationComparisonRow {
  field: string;
  currentValue: string;
  updatedValue: string;
}

interface ApprovalTrackingStage {
  stage: string;
  completed: boolean;
  current: boolean;
  rejected: boolean;
}

type BusinessPartnerConfigurationType = 'Priority' | 'SLA' | 'Category' | 'Support Group' | 'Assignment';

@Component({
  selector: 'app-approval',
  templateUrl: './approval.component.html',
  styleUrls: ['./approval.component.scss']
})
export class ApprovalComponent implements OnInit {
  approvals: ApprovalRecord[] = [];
  filteredApprovals: ApprovalRecord[] = [];
  requestTypes: string[] = [];
  statuses: string[] = [];
  selectedApproval: ApprovalRecord | null = null;
  businessPartnerChangeRequest: BusinessPartnerChangeRequest | null = null;
  ritmApprover: RitmApprover | null = null;
  businessPartnerConfigurationType: BusinessPartnerConfigurationType | null = null;
  businessPartnerCurrentConfiguration: any | null = null;
  businessPartnerUpdatedConfiguration: any | null = null;
  businessPartnerConfigurationRows: ConfigurationComparisonRow[] = [];
  businessPartnerTrackingStages: ApprovalTrackingStage[] = [];
  businessPartnerUserNames: Record<number, string> = {};
  isDetailLoading = false;
  detailLoadError = '';
  isConfigurationDetailLoading = false;
  configurationDetailError = '';
  isLoading = false;
  errorMessage = '';
  lastRefreshed = new Date();
  filterRequestType = '';
  filterStatus = '';
  filterKeyword = '';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 0;
  listPaneWidth: number | null = null;
  private detailRequestSequence = 0;
  private isResizingPanes = false;
  private approvalLayout: HTMLElement | null = null;

  constructor(
    private approvalService: ConfigApprovalService,
    private priorityService: PriorityService,
    private slaService: SlaService,
    private categoryService: CategoryService,
    private supportGroupService: SupportGroupService,
    private supportCategoryService: SupportCategoryService,
    private authenticationService: AuthenticationService,
    private ritmService: RitmService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadApprovals();
  }

  loadApprovals(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const userId = Number(localStorage.getItem('userId'));

    this.approvalService.getUserApprovalsList(userId).subscribe({
      next: response => {
        this.approvals = response?.attributes ?? [];
        this.requestTypes = [...new Set(this.approvals.map(approval => approval.requestType).filter(Boolean))].sort();
        this.statuses = [...new Set(this.approvals.map(approval => approval.status).filter(Boolean))].sort();
        this.selectedApproval = null;
        this.resetApprovalDetails();
        this.applyFilters();
        this.lastRefreshed = new Date();
        this.isLoading = false;
      },
      error: () => {
        this.approvals = [];
        this.filteredApprovals = [];
        this.requestTypes = [];
        this.statuses = [];
        this.selectedApproval = null;
        this.resetApprovalDetails();
        this.errorMessage = 'Unable to load approvals right now. Please try again shortly.';
        this.isLoading = false;
      }
    });
  }

  selectApproval(approval: ApprovalRecord): void {
    this.selectedApproval = approval;
    this.resetApprovalDetails();

    if (this.isBusinessPartnerApproval(approval)) {
      this.loadBusinessPartnerApprovalDetails(approval);
      return;
    }

    if (!this.isRitmApproval(approval)) return;

    const requestSequence = this.detailRequestSequence;
    this.isDetailLoading = true;
    this.ritmService.getRitmApprover(approval.requestId).subscribe({
      next: response => {
        if (requestSequence !== this.detailRequestSequence) return;
        this.ritmApprover = response?.attributes ?? null;
        if (!this.ritmApprover) this.detailLoadError = 'No RITM approver details were returned.';
        this.isDetailLoading = false;
      },
      error: () => {
        if (requestSequence !== this.detailRequestSequence) return;
        this.detailLoadError = 'Unable to load RITM approver details right now.';
        this.isDetailLoading = false;
      }
    });
  }

  private loadBusinessPartnerApprovalDetails(approval: ApprovalRecord): void {
    const requestSequence = this.detailRequestSequence;
    this.isDetailLoading = true;
    this.approvalService.getBusinessPartnerChangeRequest(approval.requestId).subscribe({
      next: response => {
        if (requestSequence !== this.detailRequestSequence) return;

        this.businessPartnerChangeRequest = response?.attributes ?? null;
        if (!this.businessPartnerChangeRequest) {
          this.detailLoadError = 'No business partner change request details were returned.';
        } else {
          this.businessPartnerTrackingStages = this.createBusinessPartnerTrackingStages(
            approval,
            this.businessPartnerChangeRequest
          );
          this.loadBusinessPartnerUserNames(approval, this.businessPartnerChangeRequest, requestSequence);
          this.loadBusinessPartnerConfigurationDetails(this.businessPartnerChangeRequest, requestSequence);
        }
        this.isDetailLoading = false;
      },
      error: () => {
        if (requestSequence !== this.detailRequestSequence) return;
        this.detailLoadError = 'Unable to load business partner change request details right now.';
        this.isDetailLoading = false;
      }
    });
  }

  closeDetails(): void {
    this.selectedApproval = null;
    this.resetApprovalDetails();
  }

  startPaneResize(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.approvalLayout = (event.currentTarget as HTMLElement).parentElement;
    this.isResizingPanes = true;
    this.updateListPaneWidth(event.clientX);
  }

  @HostListener('document:pointermove', ['$event'])
  resizePanes(event: PointerEvent): void {
    if (this.isResizingPanes) this.updateListPaneWidth(event.clientX);
  }

  @HostListener('document:pointerup')
  stopPaneResize(): void {
    this.isResizingPanes = false;
    this.approvalLayout = null;
  }

  onPaneResizeKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const layout = (event.currentTarget as HTMLElement).parentElement;
    if (!layout) return;

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const currentWidth = this.listPaneWidth ?? (layout.clientWidth - 12) / 2;
    this.listPaneWidth = this.clampListPaneWidth(currentWidth + direction * 24, layout.clientWidth);
  }

  private updateListPaneWidth(pointerX: number): void {
    if (!this.approvalLayout) return;
    const layoutBounds = this.approvalLayout.getBoundingClientRect();
    this.listPaneWidth = this.clampListPaneWidth(pointerX - layoutBounds.left, layoutBounds.width);
  }

  private clampListPaneWidth(width: number, layoutWidth: number): number {
    return Math.min(Math.max(width, 320), Math.max(320, layoutWidth - 332));
  }

  isBusinessPartnerApproval(approval: ApprovalRecord): boolean {
    return approval.requestType?.trim().toUpperCase() === 'BP';
  }

  isRitmApproval(approval: ApprovalRecord): boolean {
    return approval.requestType?.trim().toUpperCase() === 'RITM';
  }

  formatRitmValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getRitmNumber(approval: ApprovalRecord, approver: RitmApprover): string {
    const ritm = approver.ritm;
    if (typeof ritm === 'string' || typeof ritm === 'number') return this.formatRitmValue(ritm);
    if (ritm && typeof ritm === 'object') {
      const ritmRecord = ritm as Record<string, unknown>;
      const ritmNumber = ritmRecord['ritmNumber'] ?? ritmRecord['requestNumber'];
      if (ritmNumber !== undefined && ritmNumber !== null) return this.formatRitmValue(ritmNumber);
    }

    const templateNumber = approver.templateDetails?.find(detail =>
      /^(ritm\s*number|request\s*number)$/i.test(detail.fieldName?.trim() || '')
    )?.value;
    if (templateNumber) return this.formatRitmValue(templateNumber);

    const remarkNumber = approver.approvalRemark?.match(/\bRITM[\w-]*\b/i)?.[0];
    if (remarkNumber) return remarkNumber;

    const description = approval.description?.trim();
    return description && /^RITM[\w-]*$/i.test(description) ? description : 'N/A';
  }

  formatBusinessPartnerValue(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  getBusinessPartnerUserName(userId: number | null | undefined): string {
    if (userId == null) return 'N/A';
    return this.businessPartnerUserNames[userId] || String(userId);
  }

  getBusinessPartnerApprovalRemark(approval: ApprovalRecord, request: BusinessPartnerChangeRequest): string {
    return approval.remarks || request.remarks?.[0]?.remark || 'No remarks';
  }

  getBusinessPartnerRemarkAuthor(userId: number | null | undefined): string {
    return this.getBusinessPartnerUserName(userId);
  }

  private resetApprovalDetails(): void {
    this.detailRequestSequence++;
    this.businessPartnerChangeRequest = null;
    this.ritmApprover = null;
    this.businessPartnerConfigurationType = null;
    this.businessPartnerCurrentConfiguration = null;
    this.businessPartnerUpdatedConfiguration = null;
    this.businessPartnerConfigurationRows = [];
    this.businessPartnerTrackingStages = [];
    this.businessPartnerUserNames = {};
    this.isDetailLoading = false;
    this.detailLoadError = '';
    this.isConfigurationDetailLoading = false;
    this.configurationDetailError = '';
  }

  private loadBusinessPartnerUserNames(
    approval: ApprovalRecord,
    request: BusinessPartnerChangeRequest,
    requestSequence: number
  ): void {
    const userIds = Array.from(new Set([
      approval.createdBy,
      request.createdBy,
      request.requestedByUserId,
      ...(request.remarks || []).map(remark => remark.userId)
    ].filter((userId): userId is number => userId != null)));

    if (!userIds.length) return;

    const requests = userIds.map(userId => this.authenticationService.getUserInfoById(userId).pipe(
      map(response => ({ userId, user: response?.attributes as unknown as UserVO | null })),
      catchError(() => of({ userId, user: null }))
    ));

    forkJoin(requests).subscribe(results => {
      if (requestSequence !== this.detailRequestSequence) return;

      this.businessPartnerUserNames = results.reduce((userNames, result) => {
        const user = result.user;
        const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() : '';
        userNames[result.userId] = fullName || user?.userName || user?.registerId || String(result.userId);
        return userNames;
      }, {} as Record<number, string>);
    });
  }

  private createBusinessPartnerTrackingStages(
    approval: ApprovalRecord,
    request: BusinessPartnerChangeRequest
  ): ApprovalTrackingStage[] {
    const approvalStatus = approval.status?.toLowerCase();
    const requestStatus = request.status?.toLowerCase();
    const isDraft = approvalStatus === 'draft' || approvalStatus === 'drafted' || requestStatus === 'draft' || requestStatus === 'drafted';
    const isRejected = approvalStatus === 'rejected' || approvalStatus === 'declined' || requestStatus === 'rejected';
    const internalCompleted = !!request.internalApprovalCompleted;
    const bpCompleted = !!request.bpApprovalCompleted;
    const hasBpStage = request.changedRequestId != null && request.sourceChangeId != null && request.changedRequestId !== request.sourceChangeId;
    const allPreviousCompleted = internalCompleted && (!hasBpStage || bpCompleted);
    const stages: ApprovalTrackingStage[] = [
      { stage: 'Draft', completed: !isDraft, current: isDraft, rejected: isRejected },
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
      completed: requestStatus === 'approved',
      current: !isDraft && allPreviousCompleted && approvalStatus !== 'approved' && !isRejected,
      rejected: isRejected
    });

    return stages;
  }

  private loadBusinessPartnerConfigurationDetails(request: BusinessPartnerChangeRequest, requestSequence: number): void {
    const configurationType = this.getBusinessPartnerConfigurationType(request);
    const changedRequestId = request.changedRequestId;

    if (!configurationType || !changedRequestId) return;

    this.businessPartnerConfigurationType = configurationType;
    this.isConfigurationDetailLoading = true;
    const updated$ = this.getConfigurationById(configurationType, changedRequestId);
    const operation = request.operation?.toLowerCase();
    const shouldLoadCurrent = (operation === 'update' || operation === 'delete') && !!request.sourceChangeId;
    const current$ = shouldLoadCurrent
      ? this.getConfigurationById(configurationType, request.sourceChangeId as number)
      : of(null);

    forkJoin([updated$, current$]).subscribe({
      next: ([updatedResponse, currentResponse]) => {
        if (requestSequence !== this.detailRequestSequence) return;

        this.businessPartnerUpdatedConfiguration = this.unwrapConfigurationResponse(updatedResponse);
        this.businessPartnerCurrentConfiguration = this.unwrapConfigurationResponse(currentResponse);
        this.businessPartnerConfigurationRows = this.createConfigurationComparisonRows(
          configurationType,
          this.businessPartnerCurrentConfiguration,
          this.businessPartnerUpdatedConfiguration
        );
        this.isConfigurationDetailLoading = false;
      },
      error: () => {
        if (requestSequence !== this.detailRequestSequence) return;
        this.configurationDetailError = 'Unable to load configuration details right now.';
        this.isConfigurationDetailLoading = false;
      }
    });
  }

  private getBusinessPartnerConfigurationType(request: BusinessPartnerChangeRequest): BusinessPartnerConfigurationType | null {
    if (request.bpPriority) return 'Priority';
    if (request.bpSla) return 'SLA';
    if (request.category) return 'Category';
    if (request.supportGroup) return 'Support Group';
    if (request.assignment) return 'Assignment';
    return null;
  }

  private getConfigurationById(configurationType: BusinessPartnerConfigurationType, id: number): Observable<any> {
    switch (configurationType) {
      case 'Priority':
        return this.priorityService.getPriorityById(id);
      case 'SLA':
        return this.slaService.getSlaById(id);
      case 'Category':
        return this.categoryService.getCategoryById(id);
      case 'Support Group':
        return this.supportGroupService.getSupportGroupById(id);
      case 'Assignment':
        return this.supportCategoryService.getAssignmentById(id);
    }
  }

  private unwrapConfigurationResponse(response: any): any | null {
    return response?.attributes ?? response ?? null;
  }

  private createConfigurationComparisonRows(
    configurationType: BusinessPartnerConfigurationType,
    current: any,
    updated: any
  ): ConfigurationComparisonRow[] {
    const row = (field: string, currentValue: any, updatedValue: any): ConfigurationComparisonRow => ({
      field,
      currentValue: this.formatConfigurationValue(currentValue),
      updatedValue: this.formatConfigurationValue(updatedValue)
    });

    switch (configurationType) {
      case 'Priority':
        return [
          row('Priority Code', current?.code, updated?.code),
          row('Description', current?.description, updated?.description),
          row('Ticket Type', current?.ticketType?.ticketTypeName, updated?.ticketType?.ticketTypeName),
          row('Level', current?.level, updated?.level)
        ];
      case 'SLA':
        return [
          row('Priority', current?.priority?.code, updated?.priority?.code),
          row('Ticket Type', current?.priority?.ticketType?.ticketTypeName, updated?.priority?.ticketType?.ticketTypeName),
          row('First Response', this.formatDuration(current?.firstResponseTime, current?.firstResponseTerm), this.formatDuration(updated?.firstResponseTime, updated?.firstResponseTerm)),
          row('Resolution', this.formatDuration(current?.resolutionTime, current?.resolutionTerm), this.formatDuration(updated?.resolutionTime, updated?.resolutionTerm)),
          row('Update Frequency', this.formatDuration(current?.updateFrequency, current?.updateFrequencyTerm), this.formatDuration(updated?.updateFrequency, updated?.updateFrequencyTerm))
        ];
      case 'Category':
        return [
          row('Category Name', current?.categoryName || current?.category, updated?.categoryName || updated?.category),
          row('Subcategory', this.getSubCategoryNames(current?.subCategories) || current?.subCategoryName || current?.subCategory, this.getSubCategoryNames(updated?.subCategories) || updated?.subCategoryName || updated?.subCategory)
        ];
      case 'Support Group':
        return [
          row('Group Name', current?.groupName || current?.supportGroupName || current?.name, updated?.groupName || updated?.supportGroupName || updated?.name),
          row('Group Managers', this.getSupportGroupNames(current?.managers || current?.groupManagers, 'manager'), this.getSupportGroupNames(updated?.managers || updated?.groupManagers, 'manager')),
          row('Group Members', this.getSupportGroupNames(current?.members || current?.groupMembers, 'member'), this.getSupportGroupNames(updated?.members || updated?.groupMembers, 'member'))
        ];
      case 'Assignment':
        return [
          row('Support Group', current?.supportGroup?.groupName || current?.supportGroup?.supportGroupName || current?.supportGroup, updated?.supportGroup?.groupName || updated?.supportGroup?.supportGroupName || updated?.supportGroup),
          row('Subcategory', current?.subCategory?.subCategoryName || current?.subCategoryName || current?.subCategory, updated?.subCategory?.subCategoryName || updated?.subCategoryName || updated?.subCategory)
        ];
    }
  }

  private formatConfigurationValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  }

  private formatDuration(value: unknown, term: unknown): string {
    const formattedValue = this.formatConfigurationValue(value);
    const formattedTerm = this.formatConfigurationValue(term);
    return formattedValue === '-' ? '-' : `${formattedValue}${formattedTerm === '-' ? '' : ` ${formattedTerm}`}`;
  }

  private getSubCategoryNames(subCategories: any[] | undefined): string {
    if (!Array.isArray(subCategories)) return '';
    return subCategories.map(subCategory => subCategory?.subCategoryName).filter(Boolean).join(', ');
  }

  private getSupportGroupNames(entries: any[] | undefined, type: 'manager' | 'member'): string {
    if (!Array.isArray(entries)) return '';
    return entries.map(entry => type === 'manager'
      ? entry?.agent?.agentName
      : entry?.agent?.agentName || entry?.memberName || entry?.name
    ).filter(Boolean).join(', ');
  }

  applyFilters(): void {
    const requestType = this.filterRequestType.toLowerCase();
    const status = this.filterStatus.toLowerCase();
    const keyword = this.filterKeyword.trim().toLowerCase();

    this.filteredApprovals = this.approvals.filter(approval => {
      const searchable = [
        approval.requestId,
        approval.requestType,
        approval.description,
        approval.status,
        approval.approvalType,
        approval.approverType,
        approval.approverLevel,
        approval.createdBy,
        approval.remarks
      ].filter(value => value !== null && value !== undefined).join(' ').toLowerCase();

      return (!requestType || approval.requestType.toLowerCase() === requestType) &&
        (!status || approval.status.toLowerCase() === status) &&
        (!keyword || searchable.includes(keyword));
    });

    if (this.selectedApproval && !this.filteredApprovals.some(approval => approval.approvalId === this.selectedApproval?.approvalId)) {
      this.selectedApproval = null;
    }
    this.currentPage = 0;
  }

  clearFilters(): void {
    this.filterRequestType = '';
    this.filterStatus = '';
    this.filterKeyword = '';
    this.applyFilters();
  }

  getPaginatedApprovals(): ApprovalRecord[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.filteredApprovals.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  canTakeAction(approval: ApprovalRecord): boolean {
    return !['Approved', 'Declined', 'Rejected', 'Internal Approved', 'Clarify']
      .some(status => status.toLowerCase() === approval.status?.toLowerCase());
  }

  openApprovalDialog(action: 'approve' | 'decline' | 'clarify'): void {
    if (!this.selectedApproval) return;

    const dialogRef = this.dialog.open(ApprovalDialogComponent, {
      width: '500px',
      data: { approval: this.selectedApproval, action }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.submitApprovalAction(action, result.remark);
    });
  }

  private submitApprovalAction(action: string, remark: string): void {
    if (!this.selectedApproval) return;

    this.approvalService.applyAction({
      approvalId: this.selectedApproval.approvalId,
      action,
      remarks: remark,
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    }).subscribe({
      next: () => this.loadApprovals(),
      error: () => {
        this.errorMessage = `Unable to ${action} this approval. Please try again.`;
      }
    });
  }

  getFormattedDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}