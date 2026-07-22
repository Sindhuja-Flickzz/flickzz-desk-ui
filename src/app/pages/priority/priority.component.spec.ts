import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { of } from 'rxjs';

import { PriorityComponent } from './priority.component';
import { PriorityService } from '../../service/priority.service';

class PriorityServiceStub {
  lastCreateRequest: any = null;

  getAllPriorities() { return of({ attributes: [] }); }
  getTicketTypes() { return of({ attributes: [{ ticketTypeId: 1, ticketTypeName: 'incident' }] }); }
  createPriority(request: any) { this.lastCreateRequest = request; return of({}); }
  updatePriority() { return of({}); }
  deletePriority() { return of({}); }
  getPriorityById() { return of({}); }
}

describe('PriorityComponent', () => {
  let component: PriorityComponent;
  let fixture: ComponentFixture<PriorityComponent>;
  let priorityService: PriorityServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, NoopAnimationsModule, MatDialogModule, MatIconModule, MatPaginatorModule],
      declarations: [PriorityComponent],
      providers: [
        { provide: PriorityService, useClass: PriorityServiceStub },
        { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => null }) } },
        { provide: Location, useValue: { back: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PriorityComponent);
    component = fixture.componentInstance;
    priorityService = TestBed.inject(PriorityService) as unknown as PriorityServiceStub;
    fixture.detectChanges();
  });

  it('should expose the priority form controls', () => {
    expect(component.priorityForm.contains('level')).toBeTrue();
    expect(component.priorityForm.contains('code')).toBeTrue();
    expect(component.priorityForm.contains('description')).toBeTrue();
    expect(component.priorityForm.contains('ticketType')).toBeTrue();
    expect(component.priorityForm.contains('rank')).toBeFalse();
  });

  it('should reject level values below 1', () => {
    const levelControl = component.priorityForm.get('level');
    levelControl?.setValue(0);
    expect(levelControl?.invalid).toBeTrue();
  });

  it('should populate ticket type options from the API response', () => {
    expect(component.ticketTypes.length).toBeGreaterThan(0);
    expect(component.ticketTypes[0].ticketTypeName).toBe('incident');
  });

  it('should switch to edit mode and populate the form when editing a priority', () => {
    const priority = {
      priorityId: 10,
      priorityName: 'P1',
      description: 'High priority',
      level: 2,
      ticketType: { ticketTypeId: 2 }
    };

    component.startEdit(priority as any);

    expect(component.isEditMode).toBeTrue();
    expect(component.pageTitle).toBe('Edit Priority');
    expect(component.priorityForm.get('priorityId')?.value).toBe(10);
    expect(component.priorityForm.get('code')?.value).toBe('P1');
    expect(component.priorityForm.get('description')?.value).toBe('High priority');
    expect(component.priorityForm.get('level')?.value).toBe(2);
  });

  it('should send the BP-config payload shape when creating a priority', () => {
    component.priorityForm.patchValue({
      level: 3,
      code: 'P3',
      description: 'Critical priority',
      ticketType: 2
    });
    component.businessPartnerId = 77;

    component.onSave();

    expect(priorityService.lastCreateRequest).toEqual(jasmine.objectContaining({
      priorityId: null,
      bpConfigId: 77,
      code: 'P3',
      level: 3,
      description: 'Critical priority',
      ticketTypeId: 2,
      isActive: true
    }));
  });
});
