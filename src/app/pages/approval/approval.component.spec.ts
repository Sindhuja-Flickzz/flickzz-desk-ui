import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ApprovalComponent } from './approval.component';
import { ConfigApprovalService } from '../../service/config-approval.service';
import { PriorityService } from '../../service/priority.service';
import { SlaService } from '../../service/sla.service';
import { CategoryService } from '../../service/category.service';
import { SupportGroupService } from '../../service/support-group.service';
import { SupportCategoryService } from '../../service/support-category.service';
import { AuthenticationService } from '../../service/authentication.service';
import { RitmService } from '../../service/ritm.service';

describe('ApprovalComponent', () => {
  let component: ApprovalComponent;
  let fixture: ComponentFixture<ApprovalComponent>;
  let approvalService: jasmine.SpyObj<ConfigApprovalService>;
  let slaService: jasmine.SpyObj<SlaService>;

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ConfigApprovalService', ['getUserApprovalsList', 'getBusinessPartnerChangeRequest', 'applyAction']);
    const priorityServiceSpy = jasmine.createSpyObj('PriorityService', ['getPriorityById']);
    const slaServiceSpy = jasmine.createSpyObj('SlaService', ['getSlaById']);
    const categoryServiceSpy = jasmine.createSpyObj('CategoryService', ['getCategoryById']);
    const supportGroupServiceSpy = jasmine.createSpyObj('SupportGroupService', ['getSupportGroupById']);
    const supportCategoryServiceSpy = jasmine.createSpyObj('SupportCategoryService', ['getAssignmentById']);
    const authenticationServiceSpy = jasmine.createSpyObj('AuthenticationService', ['getUserInfoById']);
    const ritmServiceSpy = jasmine.createSpyObj('RitmService', ['getRitmApprover']);
    serviceSpy.getUserApprovalsList.and.returnValue(of({
      code: 'GM-205',
      title: 'Fetch Successful',
      description: 'Approval fetch successful!',
      attributes: [{
        approvalId: 12,
        requestId: 15,
        requestType: 'BP',
        approvalType: 'DRAFTED',
        approverLevel: 1,
        approverUserId: 3,
        approverOrgId: 2,
        status: 'Clarify',
        approverType: 'Internal',
        description: 'CREATE - Test',
        mandatory: true,
        approvedOn: null,
        createdBy: 2,
        createdOn: '2026-08-06T19:10:38.701705',
        updatedBy: 3,
        updatedOn: '2026-08-08T18:58:05.008573'
      }]
    }));
    serviceSpy.getBusinessPartnerChangeRequest.and.returnValue(of({ attributes: null }));
    slaServiceSpy.getSlaById.and.returnValue(of({
      attributes: {
        priority: { code: 'P1', ticketType: { ticketTypeName: 'Incident' } },
        firstResponseTime: 2,
        firstResponseTerm: 'Hours',
        resolutionTime: 8,
        resolutionTerm: 'Hours',
        updateFrequency: 1,
        updateFrequencyTerm: 'Hours'
      }
    }));
    authenticationServiceSpy.getUserInfoById.and.returnValue(of({
      attributes: { firstName: 'Demo', lastName: 'User' }
    } as any));
    ritmServiceSpy.getRitmApprover.and.returnValue(of({ attributes: null }));

    await TestBed.configureTestingModule({
      declarations: [ApprovalComponent],
      imports: [CommonModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ConfigApprovalService, useValue: serviceSpy },
        { provide: PriorityService, useValue: priorityServiceSpy },
        { provide: SlaService, useValue: slaServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: SupportGroupService, useValue: supportGroupServiceSpy },
        { provide: SupportCategoryService, useValue: supportCategoryServiceSpy },
        { provide: AuthenticationService, useValue: authenticationServiceSpy },
        { provide: RitmService, useValue: ritmServiceSpy },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) }
      ]
    }).compileComponents();

    approvalService = TestBed.inject(ConfigApprovalService) as jasmine.SpyObj<ConfigApprovalService>;
    slaService = TestBed.inject(SlaService) as jasmine.SpyObj<SlaService>;
    fixture = TestBed.createComponent(ApprovalComponent);
    component = fixture.componentInstance;
  });

  it('loads records from the response attributes', () => {
    fixture.detectChanges();

    expect(approvalService.getUserApprovalsList).toHaveBeenCalled();
    expect(component.approvals.length).toBe(1);
    expect(component.approvals[0].requestType).toBe('BP');
    expect(component.approvals[0].description).toBe('CREATE - Test');
  });

  it('filters approvals by request type, status, and keyword together', () => {
    fixture.detectChanges();
    component.approvals.push({
      ...component.approvals[0],
      approvalId: 13,
      requestId: 16,
      requestType: 'RITM',
      status: 'Pending',
      description: 'Network access'
    });
    component.filterRequestType = 'bp';
    component.filterStatus = 'clarify';
    component.filterKeyword = 'create - test';

    component.applyFilters();

    expect(component.filteredApprovals.length).toBe(1);
    expect(component.filteredApprovals[0].requestId).toBe(15);
  });

  it('loads and displays business partner change request details when selected', () => {
    fixture.detectChanges();
    approvalService.getBusinessPartnerChangeRequest.and.returnValue(of({
      attributes: {
        ccrId: 19,
        operation: 'CREATE',
        changedRequestId: 4,
        bpSla: true,
        configuration: {
          businessPartner: {
            businessPartnerId: 4,
            company: { companyId: 2, companyName: 'Demo Partner' }
          }
        }
      }
    }));

    component.selectApproval(component.approvals[0]);

    expect(approvalService.getBusinessPartnerChangeRequest).toHaveBeenCalledWith(15);
    expect(slaService.getSlaById).toHaveBeenCalledWith(4);
    expect(component.businessPartnerChangeRequest?.ccrId).toBe(19);
    expect(component.businessPartnerTrackingStages.map(stage => stage.stage)).toEqual(['Draft', 'Internal', 'Activation']);
    expect(component.getBusinessPartnerUserName(2)).toBe('Demo User');
    expect(component.businessPartnerConfigurationRows.map(row => row.field)).toEqual([
      'Priority', 'Ticket Type', 'First Response', 'Resolution', 'Update Frequency'
    ]);
    expect(component.businessPartnerConfigurationRows[2].updatedValue).toBe('2 Hours');
  });

  it('loads all RITM approver details when an RITM approval is selected', () => {
    fixture.detectChanges();
    const ritmService = TestBed.inject(RitmService) as jasmine.SpyObj<RitmService>;
    const approval = { ...component.approvals[0], requestId: 42, requestType: 'RITM', status: 'Pending' };
    ritmService.getRitmApprover.and.returnValue(of({
      attributes: {
        ritmApproverId: 14,
        requestId: 42,
        requestType: 'RITM',
        ritm: null,
        templateDetails: [{ fieldId: 8, fieldName: 'Short Description', value: 'Short description test1' }],
        isGroupApprover: true,
        approverConfig: { approverConfigId: 5, approverCode: 'AC003' },
        approverAgent: { agentId: 3, agentName: 'BPAgentOne' },
        approverSequence: 2,
        isMainApprover: false,
        approvalStatus: 'Pending',
        approvalRemark: 'Adding approval for RITM260831',
        approvedOn: null,
        createdBy: 3,
        createdOn: '2026-09-28T19:57:01.334916',
        updatedBy: null,
        updatedOn: '2026-09-28T19:57:01.334916',
        isActive: true
      }
    }));

    component.selectApproval(approval);

    expect(ritmService.getRitmApprover).toHaveBeenCalledWith(42);
    expect(component.ritmApprover?.approverConfig?.approverCode).toBe('AC003');
    expect(component.getRitmNumber(approval, component.ritmApprover!)).toBe('RITM260831');
    expect(component.formatRitmValue(component.ritmApprover?.isGroupApprover)).toBe('Yes');
    expect(component.canTakeAction(approval)).toBeTrue();

    fixture.detectChanges();
    const renderedDetails = fixture.nativeElement.querySelector('.ritm-approval-details').textContent;
    expect(renderedDetails).toContain('RITM260831');
    expect(renderedDetails).toContain('Short description test1');
    expect(renderedDetails).toContain('Adding approval for RITM260831');
    expect(fixture.nativeElement.querySelector('.action-buttons')).not.toBeNull();
  });
});