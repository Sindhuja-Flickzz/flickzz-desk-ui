import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationPayload } from '../../models/notification.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notification-chart-dashboard',
  template: `
    <div class="charts">
      <div class="card">Donut chart placeholder</div>
      <div class="card">Pie chart placeholder</div>
      <div class="card">Bar chart placeholder</div>
      <div class="card">Line chart placeholder</div>
    </div>
  `,
  styles: [`.charts{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}.card{padding:12px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);min-height:160px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationChartDashboardComponent {
  @Input() notifications$!: Observable<NotificationPayload[]> | null;
}
