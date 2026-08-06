import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigApprovalComponent } from './config-approval.component';
import { ConfigApprovalService } from '../../service/config-approval.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('ConfigApprovalComponent', () => {
  let component: ConfigApprovalComponent;
  let fixture: ComponentFixture<ConfigApprovalComponent>;
  let configApprovalService: jasmine.SpyObj<ConfigApprovalService>;
  let matDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    const configApprovalServiceSpy = jasmine.createSpyObj('ConfigApprovalService', ['getApprovalsList']);
    const matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ConfigApprovalComponent],
      providers: [
        { provide: ConfigApprovalService, useValue: configApprovalServiceSpy },
        { provide: MatDialog, useValue: matDialogSpy }
      ]
    }).compileComponents();

    configApprovalService = TestBed.inject(ConfigApprovalService) as jasmine.SpyObj<ConfigApprovalService>;
    matDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigApprovalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load approvals on init', () => {
    configApprovalService.getApprovalsList.and.returnValue(of([]));
    fixture.detectChanges();
    expect(configApprovalService.getApprovalsList).toHaveBeenCalled();
  });

  it('should calculate KPIs correctly', () => {
    component.approvals = [
      { status: 'Pending', approvalType: 'Internal' } as any,
      { status: 'Approved', approvalType: 'BP' } as any,
      { status: 'Rejected' } as any
    ];
    component.calculateKPIs();
    expect(component.kpiCards.length).toBe(5);
  });

  it('should filter approvals by status', () => {
    component.approvals = [
      { status: 'Pending' } as any,
      { status: 'Approved' } as any,
      { status: 'Pending' } as any
    ];
    component.filterStatus = 'Pending';
    const filtered = component.filterApprovals();
    expect(filtered.length).toBe(2);
  });

  it('should select approval', () => {
    const approval = { approvalId: 1 } as any;
    component.selectApproval(approval);
    expect(component.selectedApproval).toBe(approval);
  });

  it('should check screen size', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(500);
    component.checkScreenSize();
    expect(component.isMobile).toBe(true);
  });
});
