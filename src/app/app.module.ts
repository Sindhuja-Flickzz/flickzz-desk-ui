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
import { BpAssignmentComponent } from './pages/business-partner/bp-assignment/bp-assignment.component';
import { ManageBpComponent } from './pages/business-partner/manage-bp/manage-bp.component';
import { SlaTypeComponent } from './pages/sla-type/sla-type.component';
import { AgentComponent } from './pages/agent/agent.component';
import { FieldLabelPipe } from './pipes/field-label.pipe';
import { JoinPipe } from './pipes/field-label.pipe';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PriorityComponent } from './pages/priority/priority.component';
import { ImpactComponent } from './pages/impact/impact.component';
import { RitmComponent } from './pages/ritm/ritm.component';
import { BusinessPartnerComponent } from './pages/business-partner/business-partner.component';
import { NumberRangeComponent } from './pages/number-range/number-range.component';
import { VerifyComponent } from './pages/verify/verify.component';
import { EnquiryRegistrationComponent } from './pages/enquiry-registration/enquiry-registration.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { CategoryComponent } from './pages/category/category.component';
import { SupportGroupComponent } from './pages/support-group/support-group.component';
import { SupportCategoryComponent } from './pages/support-category/support-category.component';
import { ConfigApprovalComponent } from './pages/config-approval/config-approval.component';
import { ApprovalDialogComponent } from './pages/config-approval/approval-dialog/approval-dialog.component';
import { ProfileIconComponent } from './shared/profile-icon/profile-icon.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ProjectBuilderComponent } from './pages/project-builder/project-builder.component';
import { ProjectTimelineGanttComponent } from './pages/project-builder/project-timeline-gantt/project-timeline-gantt.component';
import { DetailsTemplateComponent } from './pages/settings/details-template/details-template.component';
import { DetailsTemplateOptionsDialogComponent } from './pages/settings/details-template/details-template-options-dialog.component';
import { ProjectStatusComponent } from './pages/project-status/project-status.component';
import { ProjectStatusCreateDialogComponent } from './pages/project-status/project-status-create-dialog/project-status-create-dialog.component';
import { ProjectStatusEpicDetailComponent } from './pages/project-status/project-status-epic-detail/project-status-epic-detail.component';
import { ProjectStatusItemDetailComponent } from './pages/project-status/project-status-item-detail/project-status-item-detail.component';
import { SystemAuditComponent } from './pages/system-audit/system-audit.component';
import { HomeComponent } from './pages/home/home.component';
import { NotificationComponent } from './notification/notification.component';
import { NotificationPopupComponent } from './shared/notification-popup/notification-popup.component';
import { NotificationDropdownComponent } from './notification-dropdown/notification-dropdown.component';
import { NotificationCenterComponent } from './pages/notification-center/notification-center.component';

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
    BpAssignmentComponent,
    ManageBpComponent,
    AgentComponent,
    FieldLabelPipe,
    JoinPipe,
    PriorityComponent,
    ImpactComponent,
    RitmComponent,
    BusinessPartnerComponent,
    NumberRangeComponent,
    VerifyComponent,
    EnquiryRegistrationComponent,
    SettingsComponent,
    CategoryComponent,
    SupportGroupComponent,
    SupportCategoryComponent,
    ConfigApprovalComponent,
    ApprovalDialogComponent,
    DetailsTemplateComponent,
    DetailsTemplateOptionsDialogComponent,
    ProfileIconComponent,
    ProfileComponent,
    ProjectBuilderComponent,
    ProjectTimelineGanttComponent,
    ProjectStatusComponent,
    ProjectStatusCreateDialogComponent,
    ProjectStatusEpicDetailComponent,
    ProjectStatusItemDetailComponent,
    SlaTypeComponent,
    HomeComponent,
    NotificationComponent,
    NotificationDropdownComponent,
    NotificationPopupComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NotificationCenterComponent,
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
    MatCheckboxModule,
    MatSnackBarModule,
    OverlayModule,
    PortalModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
    MatListModule,
    MatDividerModule,
    DragDropModule
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
