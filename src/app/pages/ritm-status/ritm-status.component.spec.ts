import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { RitmService } from '../../service/ritm.service';
import { VariantService } from '../../service/variant.service';
import { RitmStatusComponent } from './ritm-status.component';

describe('RitmStatusComponent', () => {
  let component: RitmStatusComponent;
  let ritmServiceSpy: jasmine.SpyObj<RitmService>;

  beforeEach(async () => {
    ritmServiceSpy = jasmine.createSpyObj('RitmService', ['getAllStatuses', 'updateRitmStatusVisibility']);
    ritmServiceSpy.getAllStatuses.and.returnValue(of({ attributes: [] }));
    ritmServiceSpy.updateRitmStatusVisibility.and.returnValue(of({}));
    const variantServiceSpy = jasmine.createSpyObj('VariantService', ['getWorkItemList']);
    variantServiceSpy.getWorkItemList.and.returnValue(of({ attributes: [{ code: 'RITM', label: 'Request Item' }] }));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [RitmStatusComponent],
      providers: [
        { provide: RitmService, useValue: ritmServiceSpy },
        { provide: VariantService, useValue: variantServiceSpy },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(RitmStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render an active badge state using the number-range status pattern', () => {
    const activeStatus = {
      statusId: 1,
      companyId: 1,
      statusCode: 'OPEN',
      sequenceNo: 1,
      isActive: true,
      createdBy: 1,
      isCreatorAdmin: true
    } as any;

    expect(component.getStatusText(activeStatus)).toBe('Active');
    expect(component.getStatusClass(activeStatus)).toBe('status-pill active');
  });

  it('should render an inactive badge state using the number-range status pattern', () => {
    const inactiveStatus = {
      statusId: 2,
      companyId: 1,
      statusCode: 'CLOSED',
      sequenceNo: 2,
      isActive: false,
      createdBy: 1,
      isCreatorAdmin: true
    } as any;

    expect(component.getStatusText(inactiveStatus)).toBe('Inactive');
    expect(component.getStatusClass(inactiveStatus)).toBe('status-pill inactive');
  });

  it('filters statuses by search text and request type', () => {
    component.statuses = [
      { statusId: 1, requestType: 'RITM', statusCode: 'OPEN', sequenceNo: 1 } as any,
      { statusId: 2, requestType: 'INC', statusCode: 'CLOSED', sequenceNo: 2 } as any,
      { statusId: 3, requestType: 'RITM', statusCode: 'WAITING', sequenceNo: 3 } as any
    ];
    component.searchValue = 'wait';
    component.selectedRequestType = 'RITM';

    expect(component.getFilteredStatuses().map(status => status.statusCode)).toEqual(['WAITING']);
  });

  it('filters statuses by active, inactive, and all states', () => {
    component.statuses = [
      { statusId: 1, statusCode: 'OPEN', sequenceNo: 1, isActive: true } as any,
      { statusId: 2, statusCode: 'CLOSED', sequenceNo: 2, isActive: false } as any,
      { statusId: 3, statusCode: 'PENDING', sequenceNo: 3, isActive: true } as any
    ];

    component.selectedStatusFilter = 'active';
    expect(component.getFilteredStatuses().map(status => status.statusCode)).toEqual(['OPEN', 'PENDING']);

    component.selectedStatusFilter = 'inactive';
    expect(component.getFilteredStatuses().map(status => status.statusCode)).toEqual(['CLOSED']);

    component.selectedStatusFilter = 'all';
    expect(component.getFilteredStatuses().map(status => status.statusCode)).toEqual(['OPEN', 'CLOSED', 'PENDING']);
  });

  it('clears all list filters and resets pagination', () => {
    component.searchValue = 'closed';
    component.selectedRequestType = 'INC';
    component.selectedStatusFilter = 'inactive';
    component.currentPage = 2;
    component.visibleStatusesPopupId = 4;

    component.clearListFilters();

    expect(component.searchValue).toBe('');
    expect(component.selectedRequestType).toBe('');
    expect(component.selectedStatusFilter).toBe('all');
    expect(component.currentPage).toBe(0);
    expect(component.visibleStatusesPopupId).toBeNull();
  });

  it('paginates the filtered status list', () => {
    component.statuses = Array.from({ length: 12 }, (_, index) => ({
      statusId: index + 1,
      statusCode: `STATUS_${index + 1}`,
      sequenceNo: index + 1
    } as any));
    component.currentPage = 1;
    component.pageSize = 10;

    expect(component.getPaginatedStatuses().map(status => status.statusCode)).toEqual(['STATUS_11', 'STATUS_12']);
  });

  it('updates only the selected status visibility using the full status payload', () => {
    component.statuses = [
      {
        statusId: 10, companyId: 3, requestType: 'RITM', statusCode: 'OPEN', sequenceNo: 1,
        statusColor: '#112233', visibleStatuses: [{ statusId: 11, statusCode: 'CLOSED' }],
        isActive: true, createdBy: 7, isCreatorAdmin: false
      },
      {
        statusId: 11, companyId: 3, requestType: 'RITM', statusCode: 'CLOSED', sequenceNo: 2,
        statusColor: '#445566', visibleStatuses: [], isActive: false, createdBy: 8, isCreatorAdmin: true
      }
    ] as any;

    component.onEditVisibility(component.statuses[0]);
    expect(component.isEditMode).toBeTrue();
    expect(component.getVisibilityStatuses().map(status => status.statusCode)).toEqual(['OPEN']);
    expect(component.isStatusVisible('OPEN', 'CLOSED')).toBeTrue();

    component.visibilityRules['OPEN'] = [];
    component.onSave();

    expect(ritmServiceSpy.updateRitmStatusVisibility).toHaveBeenCalledWith(jasmine.objectContaining({
      statusId: 10,
      companyId: 3,
      requestType: 'RITM',
      statusCode: 'OPEN',
      sequenceNo: 1,
      statusColor: '#112233',
      visibleStatuses: [],
      isActive: true,
      createdBy: 7,
      isCreatorAdmin: false
    }));
  });

  it('updates the selected status color and visibility together', () => {
    component.statuses = [
      {
        statusId: 10, companyId: 3, requestType: 'RITM', statusCode: 'OPEN', sequenceNo: 1,
        statusColor: '#112233', visibleStatuses: [{ statusId: 11, statusCode: 'CLOSED' }],
        isActive: true, createdBy: 7, isCreatorAdmin: false
      },
      {
        statusId: 11, companyId: 3, requestType: 'RITM', statusCode: 'CLOSED', sequenceNo: 2,
        statusColor: '#445566', visibleStatuses: [], isActive: false, createdBy: 8, isCreatorAdmin: true
      }
    ] as any;

    component.onEditVisibility(component.statuses[0]);
    component.ritmStatusForm.patchValue({ statusColor: '#abcdef' });
    component.visibilityRules['OPEN'] = [];
    component.onSave();

    expect(ritmServiceSpy.updateRitmStatusVisibility).toHaveBeenCalledWith(jasmine.objectContaining({
      statusId: 10,
      statusColor: '#abcdef',
      visibleStatuses: []
    }));
  });

  it('does not submit an invalid color while editing a status', () => {
    component.statuses = [{
      statusId: 10, companyId: 3, requestType: 'RITM', statusCode: 'OPEN', sequenceNo: 1,
      statusColor: '#112233', visibleStatuses: [], isActive: true, createdBy: 7, isCreatorAdmin: false
    }] as any;

    component.onEditVisibility(component.statuses[0]);
    component.ritmStatusForm.patchValue({ statusColor: 'invalid' });
    component.onSave();

    expect(ritmServiceSpy.updateRitmStatusVisibility).not.toHaveBeenCalled();
    expect(component.formError.statusColor).toBe('Enter a valid hex color code');
  });
});
