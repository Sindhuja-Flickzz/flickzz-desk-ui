import { ChartConfiguration } from 'chart.js';
import { Audit } from './audit.model';

export interface AuditChartConfig {
  lineChartData: ChartConfiguration<'line'>['data'];
  donutChartData: ChartConfiguration<'doughnut'>['data'];
  lineChartOptions: ChartConfiguration<'line'>['options'];
  donutChartOptions: ChartConfiguration<'doughnut'>['options'];
}

export function createAuditChartConfig(audits: Audit[]): AuditChartConfig {
  const labels = Array.from(new Set(audits.map((item) => item.createdAt?.slice(0, 10)).filter(Boolean))).sort();

  const total = labels.map((label) => audits.filter((item) => item.createdAt?.slice(0, 10) === label).length);
  const success = labels.map((label) => audits.filter((item) => item.status === 'SUCCESS' && item.createdAt?.slice(0, 10) === label).length);
  const failed = labels.map((label) => audits.filter((item) => item.status === 'FAILED' && item.createdAt?.slice(0, 10) === label).length);

  const actionCounts = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'].map((action) => audits.filter((item) => item.action === action).length);

  return {
    lineChartData: {
      labels,
      datasets: [
        { data: total, label: 'Total', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.12)', fill: true, tension: 0.35 },
        { data: success, label: 'Success', borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', fill: true, tension: 0.35 },
        { data: failed, label: 'Failed', borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.12)', fill: true, tension: 0.35 }
      ]
    },
    donutChartData: {
      labels: ['Create', 'Update', 'Delete', 'Restore'],
      datasets: [{ data: actionCounts, backgroundColor: ['#10b981', '#2563eb', '#ef4444', '#8b5cf6'] }]
    },
    lineChartOptions: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    },
    donutChartOptions: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  };
}
