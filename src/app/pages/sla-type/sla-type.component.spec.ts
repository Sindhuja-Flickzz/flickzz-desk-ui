import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { of } from 'rxjs';
import { SlaTypeComponent } from './sla-type.component';
import { PriorityService } from '../../service/priority.service';
import { CompanyService } from '../../service/company.service';
import { SlaService } from '../../service/sla.service';

describe('SlaTypeComponent', () => {
  let component: SlaTypeComponent;
  let fixture: ComponentFixture<SlaTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SlaTypeComponent],
      imports: [FormsModule, ReactiveFormsModule, NoopAnimationsModule, MatDialogModule, MatIconModule],
      providers: [
        { provide: PriorityService, useValue: { getAllPriorities: () => of({ attributes: [] }) } },
        { provide: CompanyService, useValue: { getServiceProviderList: () => of({ attributes: [] }) } },
        { provide: SlaService, useValue: { getAllSlaTypes: () => of({ attributes: [] }), createSlaType: () => of({}), updateSlaType: () => of({}), deleteSlaType: () => of({}) } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(new Map()) } },
        { provide: Location, useValue: { back: jasmine.createSpy('back') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SlaTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should keep the existing ticket type selected when editing a priority with multiple ticket-type options', () => {
    component.prioritiesRaw = [
      { priorityId: 1, code: 'P1', ticketType: { ticketTypeId: 101, ticketTypeName: 'Incident' } },
      { priorityId: 2, code: 'P1', ticketType: { ticketTypeId: 102, ticketTypeName: 'Request' } }
    ] as any;

    component.slaForm.patchValue({ priority: 'P1' });
    component.onPriorityChange(101);

    expect(component.slaForm.get('ticketType')?.value).toBe(101);
    expect(component.selectedTicketTypeName).toBe('Incident');
  });

  it('should reset unit selectors to hours when switching to create tab', () => {
    component.slaForm.patchValue({
      firstResponseUnit: 'days',
      resolutionUnit: 'days',
      updateFrequencyUnit: 'days'
    });

    component.selectTab('list');
    component.selectTab('create');

    expect(component.slaForm.get('firstResponseUnit')?.value).toBe('hours');
    expect(component.slaForm.get('resolutionUnit')?.value).toBe('hours');
    expect(component.slaForm.get('updateFrequencyUnit')?.value).toBe('hours');
  });

  it('should filter the SLA list by priority and ticket type', () => {
    component.slaList = [
      { priority: { code: 'P1', ticketType: { ticketTypeName: 'Incident' } } },
      { priority: { code: 'P2', ticketType: { ticketTypeName: 'Request' } } }
    ] as any;

    component.priorityFilter = 'P1';
    component.ticketTypeFilter = 'Incident';
    component.applySlaListFilters();

    expect(component.filteredSlaList.length).toBe(1);
    expect(component.filteredSlaList[0].priority.code).toBe('P1');
  });

  it('should filter the SLA list by status', () => {
    component.slaList = [
      { priority: { code: 'P1', ticketType: { ticketTypeName: 'Incident' }, isActive: true } },
      { priority: { code: 'P2', ticketType: { ticketTypeName: 'Request' }, isActive: false, isUnderApproval: true } },
      { priority: { code: 'P3', ticketType: { ticketTypeName: 'Request' }, isActive: false, isUnderApproval: false } }
    ] as any;

    component.selectedStatusFilter = 'under-approval';
    component.applySlaListFilters();

    expect(component.filteredSlaList.length).toBe(1);
    expect(component.filteredSlaList[0].priority.code).toBe('P2');
  });
});
