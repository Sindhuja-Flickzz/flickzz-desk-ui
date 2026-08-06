import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApprovalDialogComponent } from './approval-dialog.component';

describe('ApprovalDialogComponent', () => {
  let component: ApprovalDialogComponent;
  let fixture: ComponentFixture<ApprovalDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ApprovalDialogComponent>>;

  const mockDialogData = {
    approval: { approvalId: 1 } as any,
    action: 'approve' as const
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [ApprovalDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApprovalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get correct dialog title for approve', () => {
    component.data.action = 'approve';
    expect(component.getDialogTitle()).toBe('Approve Configuration');
  });

  it('should get correct dialog title for decline', () => {
    component.data.action = 'decline';
    expect(component.getDialogTitle()).toBe('Decline Configuration');
  });

  it('should get correct dialog title for clarify', () => {
    component.data.action = 'clarify';
    expect(component.getDialogTitle()).toBe('Request Clarification');
  });

  it('should calculate remaining characters correctly', () => {
    component.remark = 'Test';
    expect(component.remainingCharacters).toBe(496);
  });

  it('should validate remark is not empty', () => {
    component.remark = '';
    expect(component.isValid).toBe(false);
    component.remark = 'Test';
    expect(component.isValid).toBe(true);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with remark on submit', () => {
    component.remark = 'Test remark';
    component.onSubmit();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ remark: 'Test remark' });
  });

  it('should not submit with empty remark', () => {
    component.remark = '';
    component.onSubmit();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});
