import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-notification-search',
  template: `
    <div class="search-row">
      <div class="search-input">
        <mat-icon>search</mat-icon>
        <input placeholder="Search notifications..." (input)="onSearch($any($event.target).value)" />
      </div>
    </div>
  `,
  styles: [`.search-row{display:flex;align-items:center;width:100%;background:#ffffff;border-radius:24px;padding:14px 18px;box-shadow:0 16px 40px rgba(15,23,42,0.06)}
    .search-input{display:flex;align-items:center;gap:10px;flex:1;min-width:0;background:#f8fafc;border:1px solid rgba(15,23,42,0.08);border-radius:14px;padding:10px 14px}
    .search-input mat-icon{color:#667085}
    .search-input input{border:none;outline:none;width:100%;font-size:14px;background:transparent;color:#0f172a}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationSearchComponent {
  @Output() search = new EventEmitter<string>();

  onSearch(value: string) {
    this.search.emit(value);
  }
}
