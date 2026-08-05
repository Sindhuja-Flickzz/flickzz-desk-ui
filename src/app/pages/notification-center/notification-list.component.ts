import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { Observable } from 'rxjs';
import { NotificationPayload } from '../../models/notification.model';
import { NotificationCardComponent } from './notification-card.component';
import { NotificationEmptyStateComponent } from './notification-empty-state.component';

@Component({
  selector: 'app-notification-list',
  template: `
    <div class="nl-root">
      <ng-container *ngIf="notifications$ | async as items; else empty">
        <div class="nl-list">
          <app-notification-card *ngFor="let n of items" [notification]="n" (select)="select.emit($event)"></app-notification-card>
        </div>
      </ng-container>
      <ng-template #empty>
        <app-notification-empty-state></app-notification-empty-state>
      </ng-template>
    </div>
  `,
  styles: [`.nl-list{display:flex;flex-direction:column;gap:8px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationListComponent {
  @Input() notifications$!: Observable<NotificationPayload[]>;
  @Output() select = new EventEmitter<NotificationPayload>();
}
