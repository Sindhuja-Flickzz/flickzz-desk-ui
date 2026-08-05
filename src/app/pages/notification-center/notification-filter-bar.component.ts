import { Component, Output, EventEmitter, ChangeDetectionStrategy, Input } from '@angular/core';
import { Observable } from 'rxjs';

type NotificationCountKey = 'ALL' | 'UNREAD' | 'PRIORITY' | 'SLA' | 'CATEGORY' | 'SUPPORT_GROUP' | 'ASSIGNMENT';

type NotificationCounts = Record<NotificationCountKey, number>;

@Component({
  selector: 'app-notification-filter-bar',
  template: `
    <div class="filter-row">
      <div class="filter-chips">
        <button class="chip" type="button" (click)="filterChange.emit('ALL')">All <span class="count">{{(counts$|async)?.['ALL'] || 0}}</span></button>
        <button class="chip" type="button" (click)="filterChange.emit('UNREAD')">Unread <span class="count">{{(counts$|async)?.['UNREAD'] || 0}}</span></button>
        <button class="chip" type="button" (click)="filterChange.emit('PRIORITY')">Priority <span class="count">{{(counts$|async)?.['PRIORITY'] || 0}}</span></button>
        <button class="chip" type="button" (click)="filterChange.emit('SLA')">SLA <span class="count">{{(counts$|async)?.['SLA'] || 0}}</span></button>
        <button class="chip" type="button" (click)="filterChange.emit('CATEGORY')">Category <span class="count">{{(counts$|async)?.['CATEGORY'] || 0}}</span></button>
        <button class="chip" type="button" (click)="filterChange.emit('SUPPORT_GROUP')">Support Group <span class="count">{{(counts$|async)?.['SUPPORT_GROUP'] || 0}}</span></button>
        <button class="chip" type="button" (click)="filterChange.emit('ASSIGNMENT')">Assignment <span class="count">{{(counts$|async)?.['ASSIGNMENT'] || 0}}</span></button>
      </div>
      <app-notification-search class="filter-search" (search)="search.emit($event)"></app-notification-search>
    </div>
  `,
  styles: [`.filter-row{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;justify-content:space-between;width:100%}
    .filter-chips{display:flex;gap:6px;overflow-x:auto;flex:1 1 60%;padding:12px 3px;margin:0;background:#ffffff;border-radius:24px;box-shadow:0 16px 40px rgba(15,23,42,0.06)}
    .filter-search{flex:0 0 min(360px,100%);min-width:260px}
    .chip{border:none;background:#f8fafc;color:#0f172a;padding:10px 14px;border-radius:999px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;transition:background .2s,border-color .2s}
    .chip:hover{background:#eef4ff}
    .count{background:rgba(16,24,40,0.06);border-radius:999px;padding:2px 8px;font-size:12px;color:#344054}
    @media (max-width: 860px){.filter-chips{flex:1 1 100%;padding:10px 0}.filter-search{flex:1 1 100%;min-width:0}}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationFilterBarComponent {
  @Input() counts$?: Observable<NotificationCounts>;
  @Output() filterChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
}
