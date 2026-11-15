import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

interface PageVisit {
  url: string;
  state?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly storageKey = 'flickzz-navigation-history';
  private pendingBackVisit?: PageVisit;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.recordNavigation(event.urlAfterRedirects));
  }

  initialize(): void {
    const url = this.router.url;
    if (!url || url === '/') {
      return;
    }

    const visits = this.readVisits();
    if (visits.length === 0 || visits[visits.length - 1].url !== url) {
      visits.push(this.createVisit(url));
      this.writeVisits(visits);
    }
  }

  get currentPage(): string {
    const visits = this.readVisits();
    return visits[visits.length - 1]?.url ?? this.router.url;
  }

  get previousPage(): string | undefined {
    const visits = this.readVisits();
    return visits.length > 1 ? visits[visits.length - 2].url : undefined;
  }

  async navigateBack(): Promise<void> {
    const visits = this.readVisits();
    const currentUrl = this.router.url;
    const previousVisit = visits.length > 1 ? visits[visits.length - 2] : undefined;

    if (previousVisit) {
      this.pendingBackVisit = previousVisit;
      const navigated = await this.router.navigateByUrl(previousVisit.url, {
        state: previousVisit.state
      });
      if (!navigated) {
        this.pendingBackVisit = undefined;
      }
      return;
    }

    if (currentUrl !== '/home') {
      await this.router.navigateByUrl('/home');
    }
  }

  private recordNavigation(url: string): void {
    const visits = this.readVisits();
    if (this.pendingBackVisit?.url === url) {
      if (visits.length > 1) {
        visits.pop();
      }
      this.pendingBackVisit = undefined;
      this.writeVisits(visits);
      return;
    }

    this.pendingBackVisit = undefined;
    if (visits[visits.length - 1]?.url !== url) {
      visits.push(this.createVisit(url));
      this.writeVisits(visits);
    }
  }

  private createVisit(url: string): PageVisit {
    const { navigationId: _navigationId, ...state } = window.history.state ?? {};
    return {
      url,
      ...(Object.keys(state).length ? { state } : {})
    };
  }

  private readVisits(): PageVisit[] {
    const storedVisits = sessionStorage.getItem(this.storageKey);
    if (!storedVisits) {
      return [];
    }

    try {
      const visits: unknown = JSON.parse(storedVisits);
      return Array.isArray(visits) ? visits.filter(this.isPageVisit) : [];
    } catch (error) {
      console.error('Failed to read navigation history.', error);
      sessionStorage.removeItem(this.storageKey);
      return [];
    }
  }

  private writeVisits(visits: PageVisit[]): void {
    sessionStorage.setItem(this.storageKey, JSON.stringify(visits.slice(-100)));
  }

  private isPageVisit(visit: unknown): visit is PageVisit {
    return typeof visit === 'object'
      && visit !== null
      && 'url' in visit
      && typeof visit.url === 'string'
      && visit.url.startsWith('/');
  }
}
