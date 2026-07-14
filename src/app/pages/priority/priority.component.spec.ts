import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { of } from 'rxjs';

import { PriorityComponent } from './priority.component';
import { PriorityService } from '../../service/priority.service';

class PriorityServiceStub {
  getAllCompanies() { return of({ attributes: [] }); }
  getAllPriorities() { return of({ attributes: [] }); }
  getTicketTypes() { return of({ attributes: [{ ticketTypeId: 1, ticketTypeName: 'incident' }] }); }
  createPriority() { return of({}); }
  updatePriority() { return of({}); }
  deletePriority() { return of({}); }
  getPriorityById() { return of({}); }
}

describe('PriorityComponent', () => {
  let component: PriorityComponent;
  let fixture: ComponentFixture<PriorityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, NoopAnimationsModule, MatDialogModule, MatPaginatorModule],
      declarations: [PriorityComponent],
      providers: [{ provide: PriorityService, useClass: PriorityServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(PriorityComponent);
    component = fixture.componentInstance;
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
});
