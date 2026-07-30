import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Audit, AuditFilter, PageRequest } from './audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/flickzz-desk/audit/list';

  private lastFilter: AuditFilter | null = null;
  private lastPageRequest: PageRequest | null = null;
  private lastPageData: Audit[] = [];

  getAuditList(filter: AuditFilter, pageRequest: PageRequest): Observable<Audit[]> {
    this.lastFilter = filter;
    this.lastPageRequest = pageRequest;

    const params = this.buildParams(filter, pageRequest);

    return this.http.get<Audit[]>(this.endpoint, { params }).pipe(
      map((response) => {
        this.lastPageData = Array.isArray((response as any)?.attributes) ? (response as any).attributes : [];
        return this.lastPageData;
      }),
      catchError((error) => {
        console.error('Audit service error', error);
        return throwError(() => new Error('Unable to load audit data. Please try again.'));
      })
    );
  }

  refresh(): Observable<Audit[]> {
    if (!this.lastFilter || !this.lastPageRequest) {
      return this.getAuditList({}, { page: 0, size: 20, sort: 'createdAt,desc' });
    }

    return this.getAuditList(this.lastFilter, this.lastPageRequest);
  }

  export(filter: AuditFilter, pageRequest: PageRequest): void {
    const data = this.lastPageData.length ? this.lastPageData : [];
    if (!data.length) {
      return;
    }

    const csvContent = this.toCsv(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private buildParams(filter: AuditFilter, _pageRequest: PageRequest): HttpParams {
    let params = new HttpParams();

    const entries: Array<[string, string | number | undefined]> = [
      ['action', filter.action],
      ['area', filter.area],
      ['status', filter.status],
      ['changedBy', filter.userName],
      ['search', filter.search],
      ['fromDate', filter.fromDate],
      ['toDate', filter.toDate],
      ['orgId', localStorage.getItem('userOrgId') ? Number(localStorage.getItem('userOrgId')) : 0]
    ];

    entries.forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  private toCsv(items: Audit[]): string {
    const headers = ['auditId', 'createdAt', 'area', 'action', 'changedBy', 'status', 'description'];
    const rows = items.map((item) => [
      item.auditId ?? '',
      item.createdAt ?? '',
      item.area ?? '',
      item.action ?? '',
      item.userName ?? '',
      item.status ?? '',
      (item.description ?? '').replace(/\n/g, ' ')
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
