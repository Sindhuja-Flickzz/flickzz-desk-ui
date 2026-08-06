import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { NotificationCenterModule } from './notification-center.module';
import { NotificationService } from '../../service/notification.service';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { NotificationPayload } from '../../models/notification.model';

type NotificationCountKey = 'ALL' | 'UNREAD' | 'PRIORITY' | 'SLA' | 'CATEGORY' | 'SUPPORT_GROUP' | 'ASSIGNMENT';

type NotificationCounts = Record<NotificationCountKey, number>;

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatDividerModule, MatIconModule, NotificationCenterModule],
  template: `
    <div class="nc-root">
      <app-notification-header
        (refresh)="refresh()"
        (markAllRead)="markAllRead()"
        (clearAll)="clearAll()"
      ></app-notification-header>

      <div class="nc-controls">
        <app-notification-filter-bar [counts$]="counts$" (filterChange)="onFilter($event)" (search)="onSearch($event)"></app-notification-filter-bar>
      </div>

      <div class="nc-grid" [class.nc-has-selected]="selected">
        <div class="nc-column nc-list-column">
          <div class="section-header">
            <div class="section-title">Notifications</div>
            <div class="section-sort">
              <span class="section-note">Sort by:</span>
              <select class="sort-field" (change)="onSort($any($event.target).value)">
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="unread">Unread First</option>
                <option value="priority">Priority</option>
                <option value="pending">Pending Approval</option>
              </select>
            </div>
          </div>
          <app-notification-list
            [notifications$]="filteredNotifications$"
            (select)="select($event)"
            (clear)="clear($event)"
          ></app-notification-list>
          <!-- <app-notification-chart-dashboard [notifications$]="notifications$"></app-notification-chart-dashboard> -->
        </div>

        <div class="nc-column nc-details-column" *ngIf="selected">
          <app-notification-details [notification]="selected" (action)="onDetailsAction($event)"></app-notification-details>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./notification-center.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationCenterComponent implements OnInit {
  notifications$: Observable<NotificationPayload[]>;
  filteredNotifications$: Observable<NotificationPayload[]>;
  counts$!: Observable<NotificationCounts>;
  private filter$ = new BehaviorSubject<string>('ALL');
  private search$ = new BehaviorSubject<string>('');
  private sort$ = new BehaviorSubject<string>('latest');
  selected: NotificationPayload | null = null;

  constructor(private svc: NotificationService) {
    this.notifications$ = this.svc.notifications$;

    this.counts$ = this.notifications$.pipe(
      map((items) => {
        const counts: NotificationCounts = {
          ALL: items.length,
          UNREAD: items.filter((i) => !i.isRead).length,
          PRIORITY: items.filter((i) => i.notificationType === 'Priority').length,
          SLA: items.filter((i) => i.notificationType === 'SLA').length,
          CATEGORY: items.filter((i) => i.notificationType === 'Category').length,
          SUPPORT_GROUP: items.filter((i) => i.notificationType === 'Support Group').length,
          ASSIGNMENT: items.filter((i) => i.notificationType === 'Assignment').length
        };
        return counts;
      })
    );

    this.filteredNotifications$ = combineLatest([
      this.notifications$,
      this.filter$.pipe(startWith('ALL')),
      this.search$.pipe(startWith('')),
      this.sort$.pipe(startWith('latest'))
    ]).pipe(
      map(([items, filter, search, sort]) => {
        let out = items.slice();
        // filter
        if (filter === 'UNREAD') {
          out = out.filter((i) => !i.isRead);
        } else if (filter === 'PRIORITY') {
          out = out.filter((i) => i.notificationType === 'Priority');
        } else if (filter === 'SLA') {
          out = out.filter((i) => i.notificationType === 'SLA');
        } else if (filter === 'CATEGORY') {
          out = out.filter((i) => i.notificationType === 'Category');
        } else if (filter === 'SUPPORT_GROUP') {
          out = out.filter((i) => i.notificationType === 'Support Group');
        } else if (filter === 'ASSIGNMENT') {
          out = out.filter((i) => i.notificationType === 'Assignment');
        }

        // search
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          out = out.filter((i) => {
            return (
              (i.title ?? '').toLowerCase().includes(q) ||
              (i.message ?? '').toLowerCase().includes(q) ||
              (i.notificationType ?? '').toLowerCase().includes(q) ||
              (i.action ?? '').toLowerCase().includes(q) ||
              (i.companyName ?? '').toLowerCase().includes(q) ||
              (i.initiatedBy ?? '').toString().toLowerCase().includes(q)
            );
          });
        }

        // sort
        out.sort((a, b) => {
          const ta = new Date(a.createdOn ?? '').getTime() || 0;
          const tb = new Date(b.createdOn ?? '').getTime() || 0;
          if (sort === 'latest') return tb - ta;
          if (sort === 'oldest') return ta - tb;
          if (sort === 'unread') return (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0) || tb - ta;
          return tb - ta;
        });

        return out;
      })
    );
  }

  select(item: NotificationPayload) {
    this.selected = item;
    if (item && !item.isRead) {
      this.svc.markAsRead(item.notificationId ?? '');
    }
  }

  ngOnInit(): void {
    this.svc.fetchNotifications();
  }

  refresh() {
    this.svc.fetchNotifications();
  }

  markAllRead() {
    this.svc.markAllAsRead();
  }

  clear(item: NotificationPayload) {
    const id = item?.notificationId ?? '';
    if (!id) { return; }
    this.svc.clearNotification(id).subscribe();
  }

  clearAll() {
    const userId = localStorage.getItem('userId') || '';
    this.svc.clearAll(userId).subscribe();
  }

  onFilter(f: string) { this.filter$.next(f); }
  onSearch(q: string) { this.search$.next(q); }
  onSort(s: string) { this.sort$.next(s); }
  onDetailsAction(_a: any) {}
}
