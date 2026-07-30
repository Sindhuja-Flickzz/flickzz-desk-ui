import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgChartsModule } from 'ng2-charts';
import { Audit, AuditFilter, PageRequest, ParsedAuditValue } from './audit.model';
import { AuditService } from './audit.service';
import { AuditChartConfig, createAuditChartConfig } from './chart.config';

@Component({
  selector: 'app-system-audit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatSelectModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    MatExpansionModule,
    ScrollingModule,
    NgChartsModule
  ],
  templateUrl: './system-audit.component.html',
  styleUrls: ['./system-audit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemAuditComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly fb = inject(FormBuilder);

  readonly filterForm: FormGroup;
  readonly loading = signal(false);
  readonly audits = signal<Audit[]>([]);
  readonly selectedAudit = signal<Audit | null>(null);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly totalPages = signal(1);
  readonly drawerOpen = signal(false);
  readonly drawerExpanded = signal(false);
  readonly drawerWidth = computed(() => this.drawerExpanded() ? '100%' : '460px');
  readonly chartConfig = signal<AuditChartConfig | null>(null);
  readonly areas = signal<string[]>([]);
  readonly actions = signal<string[]>([]);
  readonly statuses = signal<string[]>([]);
  readonly changedByOptions = signal<string[]>([]);
  readonly displayedColumns = ['time', 'area', 'action', 'changedBy', 'status', 'description', 'details'];

  readonly selectedAuditDetails = computed(() => {
    const audit = this.selectedAudit();
    if (!audit) {
      return null;
    }

    const oldValue = this.parseJson(audit.oldValue);
    const newValue = this.parseJson(audit.newValue);
    const changedDiff = this.parseJson(audit.changedFields);
    const changedFields = this.getChangedFields(audit.action, oldValue, newValue, changedDiff);

    return { audit, oldValue, newValue, changedDiff, changedFields };
  });

  readonly pagedAudits = computed(() => {
    const items = this.audits();
    const start = this.page() * this.pageSize();
    return items.slice(start, start + this.pageSize());
  });

  readonly summaryCards = computed(() => {
    const items = this.audits();
    return [
      { icon: 'timeline', title: 'Total Audit Events', value: items.length.toString(), hint: '+8.2% this week' },
      { icon: 'check_circle', title: 'Successful Changes', value: items.filter((item) => item.status === 'SUCCESS').length.toString(), hint: 'Stable' },
      { icon: 'error', title: 'Failed Changes', value: items.filter((item) => item.status === 'FAILED').length.toString(), hint: 'Needs follow-up' }
    ];
  });

  readonly isEmpty = computed(() => !this.loading() && this.audits().length === 0);

  readonly actionColors: Record<string, string> = {
    CREATE: 'success',
    UPDATE: 'primary',
    DELETE: 'warn',
    RESTORE: 'accent'
  };

  readonly statusColors: Record<string, string> = {
    SUCCESS: 'success',
    FAILED: 'warn',
    PENDING: 'primary'
  };

  constructor() {
    this.filterForm = this.fb.group({
      action: [''],
      area: [''],
      status: [''],
      changedBy: [''],
      search: [''],
      fromDate: [''],
      toDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadAuditData();
  }

  applyFilters(): void {
    this.page.set(0);
    this.loadAuditData();
  }

  clearFilters(): void {
    this.filterForm.reset({ action: '', area: '', status: '', changedBy: '', search: '', fromDate: '', toDate: '' });
    this.page.set(0);
    this.loadAuditData();
  }

  refresh(): void {
    this.loadAuditData();
  }

  exportData(): void {
    this.auditService.export(this.buildFilter(), this.buildPageRequest());
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  selectAudit(audit: Audit): void {
    this.selectedAudit.set(audit);
    this.drawerOpen.set(true);
  }

  toggleDrawerExpand(): void {
    this.drawerExpanded.update((value) => !value);
  }

  copyAuditId(): void {
    const auditId = this.selectedAudit()?.auditId;
    if (!auditId) {
      return;
    }

    navigator.clipboard?.writeText(auditId).catch(() => {
      console.warn('Clipboard copy failed for audit ID.');
    });
  }

  downloadJson(): void {
    const audit = this.selectedAudit();
    if (!audit) {
      return;
    }

    const content = JSON.stringify(audit, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-${audit.auditId || audit.id || 'record'}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerExpanded.set(false);
    this.selectedAudit.set(null);
  }

  applyDateShortcut(days: number | null): void {
    const to = new Date();
    const from = days ? new Date(to.getTime() - days * 24 * 60 * 60 * 1000) : new Date(to.getFullYear(), to.getMonth(), 1);
    this.filterForm.patchValue({
      fromDate: this.formatDate(from),
      toDate: this.formatDate(to)
    });
    this.page.set(0);
    this.loadAuditData();
  }

  trackByAudit(_index: number, audit: Audit): string {
    return audit.id?.toString() ?? audit.auditId ?? audit.createdAt ?? `${_index}`;
  }

  trackBySummaryCard(_index: number, card: { icon: string; title: string; value: string; hint: string }): string {
    return `${card.title}-${_index}`;
  }

  getParsedChanges(audit: Audit | null): ParsedAuditValue[] {
    if (!audit?.changedFields) {
      return [];
    }

    const parsed = this.tryParseJson(audit.changedFields);
    if (Array.isArray(parsed)) {
      return parsed as ParsedAuditValue[];
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, unknown>).map(([field, value]) => ({ field, oldValue: value, newValue: value }));
    }

    return [];
  }

  getParsedValue(value: string | undefined): unknown {
    return value ? this.tryParseJson(value) : null;
  }

  getParsedChangesCount(audit: Audit | null): number {
    return this.getParsedChanges(audit).length;
  }

  formatJson(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'string') {
      const parsed = this.parseJson(value);
      return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : value;
    }

    return JSON.stringify(value, null, 2);
  }

  getChangedFields(action: string | undefined, oldValue: unknown, newValue: unknown, changedDiff: unknown): ParsedAuditValue[] {
    const entries: ParsedAuditValue[] = [];

    if (Array.isArray(changedDiff)) {
      for (const item of changedDiff) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const record = item as Record<string, unknown>;
        const field = (record['field'] as string) || (record['name'] as string) || (record['key'] as string);
        if (!field) {
          continue;
        }

        entries.push({
          field,
          oldValue: record['oldValue'] ?? record['previousValue'] ?? record['before'] ?? record['old'] ?? '—',
          newValue: record['newValue'] ?? record['currentValue'] ?? record['after'] ?? record['new'] ?? '—'
        });
      }
    } else if (changedDiff && typeof changedDiff === 'object') {
      for (const [field, value] of Object.entries(changedDiff as Record<string, unknown>)) {
        if (value === null || value === undefined) {
          continue;
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
          const record = value as Record<string, unknown>;
          const oldValue = record['oldValue'] ?? record['previousValue'] ?? record['before'] ?? record['old'];
          const newValue = record['newValue'] ?? record['currentValue'] ?? record['after'] ?? record['new'];

          if (oldValue !== undefined || newValue !== undefined) {
            entries.push({ field, oldValue: oldValue ?? '—', newValue: newValue ?? '—' });
            continue;
          }
        }

        entries.push({ field, oldValue: '—', newValue: value ?? '—' });
      }
    }

    return entries.map((item) => ({
      field: item.field,
      oldValue: action === 'CREATE' ? '—' : item.oldValue,
      newValue: action === 'DELETE' ? '—' : item.newValue
    }));
  }

  trackByChangedField(_index: number, item: ParsedAuditValue): string {
    return item.field;
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value, null, 2);
  }

  private parseJson(value: string | undefined): unknown {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private loadAuditData(): void {
    const filter = this.buildFilter();
    const pageRequest = this.buildPageRequest();

    this.loading.set(true);
    this.auditService.getAuditList(filter, pageRequest)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items: Audit[]) => {
          const safeItems = items ?? [];
          this.audits.set(safeItems);
          this.totalElements.set(safeItems.length);
          this.totalPages.set(Math.max(1, Math.ceil(safeItems.length / this.pageSize())));
          this.page.set(Math.min(this.page(), Math.max(0, this.totalPages() - 1)));
          this.updateAnalytics(safeItems);
          this.selectedAudit.set(this.pagedAudits()[0] ?? safeItems[0] ?? null);
        },
        error: () => {
          this.audits.set([]);
          this.totalElements.set(0);
          this.totalPages.set(1);
          this.updateAnalytics([]);
          this.selectedAudit.set(null);
        }
      });
  }

  private buildFilter(): AuditFilter {
    const formValue = this.filterForm.getRawValue();
    const filter: AuditFilter = {};

    if (formValue.action) filter.action = formValue.action;
    if (formValue.area) filter.area = formValue.area;
    if (formValue.status) filter.status = formValue.status;
    if (formValue.changedBy) filter.userName = formValue.changedBy;
    if (formValue.search) filter.search = formValue.search ? formValue.search.trim() : 'NA';
    if (formValue.fromDate) filter.fromDate = this.formatDateTime(formValue.fromDate);
    if (formValue.toDate) filter.toDate = this.formatDateTime(formValue.toDate, true);
    filter.orgId = localStorage.getItem('orgId') ? Number(localStorage.getItem('orgId')) : undefined;

    return filter;
  }

  private buildPageRequest(): PageRequest {
    return { page: this.page(), size: this.pageSize(), sort: 'createdAt,desc' };
  }

  private updateAnalytics(items: Audit[]): void {
    this.areas.set([...new Set(items.map((item) => item.area).filter(Boolean))] as string[]);
    this.actions.set([...new Set(items.map((item) => item.action).filter(Boolean))] as string[]);
    this.statuses.set([...new Set(items.map((item) => item.status).filter(Boolean))] as string[]);
    this.changedByOptions.set([...new Set(items.map((item) => item.userName).filter(Boolean))] as string[]);
    this.chartConfig.set(createAuditChartConfig(items));
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateTime(value: string, endOfDay = false): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    if (endOfDay) {
      date.setHours(23, 59, 59, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}T${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}:${`${date.getSeconds()}`.padStart(2, '0')}`;
  }
}
