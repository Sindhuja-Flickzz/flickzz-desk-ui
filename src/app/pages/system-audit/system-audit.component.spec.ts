import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemAuditComponent } from './system-audit.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuditService } from './audit.service';

describe('SystemAuditComponent', () => {
  let component: SystemAuditComponent;
  let fixture: ComponentFixture<SystemAuditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemAuditComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), AuditService]
    }).compileComponents();

    fixture = TestBed.createComponent(SystemAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should open a draft audit drawer when createNewAudit is called', () => {
    component.createNewAudit();

    expect(component.drawerOpen()).toBeTrue();
    expect(component.selectedAudit()?.auditId).toBe('New Audit Draft');
    expect(component.isCreating()).toBeTrue();
  });
});
