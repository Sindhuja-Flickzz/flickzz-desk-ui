import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { NotificationHeaderComponent } from './notification-header.component';
import { NotificationFilterBarComponent } from './notification-filter-bar.component';
import { NotificationSearchComponent } from './notification-search.component';
import { NotificationListComponent } from './notification-list.component';
import { NotificationCardComponent } from './notification-card.component';
import { NotificationEmptyStateComponent } from './notification-empty-state.component';
import { NotificationDetailsComponent } from './notification-details.component';
import { ApprovalWorkflowComponent } from './approval-workflow.component';
import { NotificationChartDashboardComponent } from './notification-chart-dashboard.component';

@NgModule({
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatIconModule, MatListModule, MatCardModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  declarations: [
    NotificationHeaderComponent,
    NotificationFilterBarComponent,
    NotificationSearchComponent,
    NotificationListComponent,
    NotificationCardComponent,
    NotificationEmptyStateComponent,
    NotificationDetailsComponent,
    ApprovalWorkflowComponent,
    NotificationChartDashboardComponent
  ],
  exports: [
    NotificationHeaderComponent,
    NotificationFilterBarComponent,
    NotificationSearchComponent,
    NotificationListComponent,
    NotificationCardComponent,
    NotificationEmptyStateComponent,
    NotificationDetailsComponent,
    ApprovalWorkflowComponent,
    NotificationChartDashboardComponent
  ]
})
export class NotificationCenterModule {}
