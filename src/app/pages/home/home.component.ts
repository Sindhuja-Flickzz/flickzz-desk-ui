import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WorkItem } from '../../models/variant.model';
import { VariantService } from '../../service/variant.service';

interface HomeTile {
  title: string;
  description: string;
  icon: string;
  route?: string;
  state?: { requestType: string };
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  tiles: HomeTile[] = [
    {
      title: 'Approval',
      description: 'Review pending approvals and take action.',
      icon: 'fact_check'
    },
    {
      title: 'My Tickets',
      description: 'Access and track your support tickets.',
      icon: 'support_agent'
    },
    {
      title: 'Group RITM',
      description: 'Manage RITM requests for your group.',
      icon: 'group'
    }
  ];
  workItemsError = '';

  constructor(
    private router: Router,
    private variantService: VariantService
  ) {}

  ngOnInit(): void {
    const orgId = localStorage.getItem('userOrgId') || '';
    if (!orgId) {
      this.workItemsError = 'Organization information is unavailable.';
      return;
    }

    this.variantService.getWorkItemList(orgId).subscribe({
      next: response => {
        const workItems = response?.attributes ?? response;
        if (!Array.isArray(workItems)) {
          this.workItemsError = 'Failed to load work items.';
          return;
        }

        const serviceRequestTiles = workItems
          .filter((item: WorkItem) =>
            item?.isParent === true
            && item.isServiceRequest === true
            && typeof item.code === 'string'
            && item.code.trim().length > 0
          )
          .map((item: WorkItem): HomeTile => ({
            title: item.code.trim(),
            description: '',
            icon: 'assignment',
            route: '/ticket',
            state: { requestType: item.code.trim() }
          }));

        this.tiles = [...this.tiles, ...serviceRequestTiles];
      },
      error: err => {
        console.error('Load home work items error', err);
        this.workItemsError = err.error?.description || err.error?.message || 'Failed to load work items.';
      }
    });
  }

  open(tile: HomeTile): void {
    if (tile.route) {
      if (tile.state?.requestType) {
        this.router.navigate([tile.route, tile.state.requestType], {
          state: { requestType: tile.state.requestType }
        });
      } else {
        this.router.navigate([tile.route]);
      }
      return;
    }

    switch (tile.title) {
      case 'Approval':
        this.router.navigate(['/approval']);
        break;
      case 'RITM':
        this.router.navigate(['/ritm']);
        break;
      case 'My Tickets':
        this.router.navigate(['/my-tickets']);
        break;
      case 'Group RITM':
        this.router.navigate(['/group-ritm']);
        break;
    }
  }
}
