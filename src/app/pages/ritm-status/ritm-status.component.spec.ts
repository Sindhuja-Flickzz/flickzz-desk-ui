import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { RitmService } from '../../service/ritm.service';
import { RitmStatusComponent } from './ritm-status.component';

describe('RitmStatusComponent', () => {
  let component: RitmStatusComponent;

  beforeEach(async () => {
    const ritmServiceSpy = jasmine.createSpyObj('RitmService', ['getRitmStatuses']);
    ritmServiceSpy.getRitmStatuses.and.returnValue(of({ attributes: [] }));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [RitmStatusComponent],
      providers: [
        { provide: RitmService, useValue: ritmServiceSpy },
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
});
