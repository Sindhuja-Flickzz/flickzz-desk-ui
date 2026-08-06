import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-empty-state',
  template: `
    <div class="empty">
      <h3>No notifications</h3>
      <p>You're all caught up — no notifications available right now.</p>
    </div>
  `,
  styles: [`.empty{padding:24px;text-align:center;color:rgba(0,0,0,0.6)}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationEmptyStateComponent {}
