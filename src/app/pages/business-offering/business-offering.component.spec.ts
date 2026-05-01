import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessOfferingComponent } from './business-offering.component';

describe('BusinessOfferingComponent', () => {
  let component: BusinessOfferingComponent;
  let fixture: ComponentFixture<BusinessOfferingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BusinessOfferingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessOfferingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
