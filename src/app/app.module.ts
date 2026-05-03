import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { CalendarListPageComponent } from './pages/calendar/calendar-list/calendar-list.component';
import { CalendarDetailsModalComponent } from './pages/calendar/calendar-details-modal/calendar-details-modal.component';
import { CalendarComponent } from './pages/calendar/calendar.component/calendar.component';
import { CalendarTypeComponent } from './pages/calendar/type/calendar-type.component';
import { ConfirmationDialogComponent } from './shared/confirmation-dialog/confirmation-dialog.component';
import { PlantComponent } from './pages/plant/plant.component';
import { SkillComponent } from './pages/skill/skill.component';
import { CompanyComponent } from './pages/company/company.component';
import { AgentComponent } from './pages/agent/agent.component';
import { FieldLabelPipe } from './pipes/field-label.pipe';
import {HttpClient, HttpClientModule, HTTP_INTERCEPTORS} from "@angular/common/http";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import { AuthInterceptor } from './service/auth.interceptor';

// Angular Material imports
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PriorityComponent } from './pages/priority/priority.component';
import { ImpactComponent } from './pages/impact/impact.component';
import { RitmComponent } from './pages/ritm/ritm.component';
import { BusinessOfferingComponent } from './pages/business-offering/business-offering.component';
import { NumberRangeComponent } from './pages/number-range/number-range.component';
import { VerifyComponent } from './pages/verify/verify.component';
import { EnquiryRegistrationComponent } from './pages/enquiry-registration/enquiry-registration.component';
import { SettingsComponent } from './pages/settings/settings.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    WelcomeComponent,
    CalendarListPageComponent,
    CalendarDetailsModalComponent,
    CalendarComponent,
    CalendarTypeComponent,
    ConfirmationDialogComponent,
    PlantComponent,
    SkillComponent,
    CompanyComponent,
    AgentComponent,
    FieldLabelPipe,
    PriorityComponent,
    ImpactComponent,
    RitmComponent,
    BusinessOfferingComponent,
    NumberRangeComponent,
    VerifyComponent,
    EnquiryRegistrationComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    // Angular Material modules
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatGridListModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  providers: [
    HttpClient,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
