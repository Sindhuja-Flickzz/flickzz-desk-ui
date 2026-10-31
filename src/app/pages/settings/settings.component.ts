import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface SettingsTile {
  title: string;
  route?: string;
  view?: string;
  children?: SettingsTile[];
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  private readonly rootTiles: SettingsTile[] = [
    { title: 'Company', route: '/company' },
    { title: 'Plant', route: '/plant' },
    { title: 'Calendar', route: '/calendar' },
    { title: 'Skills', route: '/skill' },
    { title: 'Agent', route: '/agent' },
    { title: 'Number Range', route: '/number-range' },
    { title: 'Impact', route: '/impact' },
    { title: 'RITM', route: '/ritm' },
    { title: 'RITM Status', route: '/ritm-status' },
    { title: 'Request Types', route: '/request-type' },
    { title: 'Effort Types', route: '/effort-type' },
    { title: 'My Tickets', route: '/my-tickets' },
    { title: 'Group RITM', route: '/group-ritm' },
    { title: 'Variant', route: '/variant' },
    { title: 'Template', route: '/templatecomponent' },
    {
      title: 'Configuration',
      view: 'configuration',
      children: [
        {
          title: 'Approval configuration',
          view: 'approval-configuration',
          children: [
            { title: 'Create approver code', route: '/request-approver', view: 'approval-configuration' },
            { title: 'Create approval workflow', route: '/approval-workflow', view: 'approval-configuration' }
          ]
        }
      ]
    }
  ];

  tiles = this.rootTiles;
  private readonly navigationStack: SettingsTile[][] = [];
  private readonly viewStack: (string | null)[] = [];
  private currentView: string | null = null;

  constructor(private router: Router) {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    this.restoreView(navigationState?.['settingsView'] ?? window.history.state?.settingsView);
  }

  get canGoBack(): boolean {
    return this.navigationStack.length > 0;
  }

  onTileClick(tile: SettingsTile): void {
    if (tile.children) {
      this.navigationStack.push(this.tiles);
      this.viewStack.push(this.currentView);
      this.tiles = tile.children;
      this.currentView = tile.view ?? null;
      return;
    }

    if (tile.route) {
      this.router.navigate([tile.route], {
        state: { settingsView: tile.view ?? this.currentView }
      });
    }
  }

  goBack(): void {
    const previousTiles = this.navigationStack.pop();
    if (previousTiles) {
      this.tiles = previousTiles;
      this.currentView = this.viewStack.pop() ?? null;
    }
  }

  private restoreView(view: unknown): void {
    if (view !== 'configuration' && view !== 'approval-configuration') {
      return;
    }

    const configurationTile = this.rootTiles.find(tile => tile.view === 'configuration');
    if (!configurationTile?.children) {
      return;
    }

    this.navigationStack.push(this.rootTiles);
    this.viewStack.push(null);
    this.tiles = configurationTile.children;
    this.currentView = 'configuration';

    if (view === 'approval-configuration') {
      const approvalConfigurationTile = this.tiles.find(tile => tile.view === view);
      if (approvalConfigurationTile?.children) {
        this.navigationStack.push(this.tiles);
        this.viewStack.push(this.currentView);
        this.tiles = approvalConfigurationTile.children;
        this.currentView = view;
      }
    }
  }
}