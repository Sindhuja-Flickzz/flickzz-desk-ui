import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSupportCalendarComponent } from './create-support-calendar.component';

describe('CreateSupportCalendarComponent', () => {
  let component: CreateSupportCalendarComponent;
  let fixture: ComponentFixture<CreateSupportCalendarComponent>;

  beforeEach(async) {
    await TestBed.configureTestingModule({
      declarations: [ CreateSupportCalendarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateSupportCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
