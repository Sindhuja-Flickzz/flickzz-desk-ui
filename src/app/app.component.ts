import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthenticationService } from './service/authentication.service';
import { MenuItem } from './models/menu';
import { MENU_INFO, APP_CONSTANTS } from './data/app_constants';

export interface MenuNode {
  id: number;
  name: string;
  children?: MenuNode[];
  icon: string;
  isParent?: boolean;
  route?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  app_consants = APP_CONSTANTS;

  isSidebarCollapsed = false;
  isMobileMenuOpen = false;
  menuItems: MenuItem[] = [];
  menuTree: MenuNode[] = [];
  activeNodeId?: number;
  openPath: MenuNode[] = [];
  showSidebar = false;
  hoveredNodeAtLevel: Map<number, MenuNode> = new Map();
  popupTopPosition: Map<number, number> = new Map();
  private closeMenuTimeout?: any;

  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  ngOnInit() {
    const currentUrl = this.router.url;
    this.showSidebar = !!localStorage.getItem('token') && !currentUrl.startsWith('/login') && !currentUrl.startsWith('/register');
    if (this.showSidebar) {
      this.loadMenu();
    }

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Show sidebar for authenticated routes only
        const show = !!localStorage.getItem('token') && !event.url.startsWith('/login') && !event.url.startsWith('/register');
        this.showSidebar = show;
        if (show) {
          this.loadMenu();
        }

        // Close mobile menu on route change
        this.isMobileMenuOpen = false;
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
    }
  }

  loadMenu() {
    this.menuItems = MENU_INFO.filter(m => m.isActive);
    this.menuTree = this.menuItems.map(m => this.normalizeToNode(m));
    this.openPath = [];
  }

  refreshMenu() {
    this.openPath = [];
    this.activeNodeId = undefined;
    this.loadMenu();
  }

  onNodeHover(node: MenuNode, level: number = 0, event?: Event) {
    
    this.setActive(node.id);
    // Clear any pending close timeout
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
      this.closeMenuTimeout = undefined;
    }
    
    if (!node) return;
    this.hoveredNodeAtLevel.set(level, node);
    
    // Calculate popup position based on the hovered button's position
    if (event) {
      const button = event.target as HTMLElement;
      const rect = button.getBoundingClientRect();
      const menuElement = (event.target as HTMLElement).closest('.menu');
      if (menuElement) {
        const menuRect = menuElement.getBoundingClientRect();
        const topPosition = rect.top - menuRect.top;
        this.popupTopPosition.set(level, topPosition);
      }
    }
    
    this.setOpenPath(node);
  }

  onPopupHover() {
    // Clear any pending close timeout when hovering over popups
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
      this.closeMenuTimeout = undefined;
    }
  }

  onNodeClick(node: MenuNode) {
    this.setActive(node.id);

    if (node.route) {
      if (node.route === '/calendar/create-calendar') {
        const type = node.name?.toLowerCase().includes('requestor') ? 'requestor' : 'support';
        this.router.navigate([node.route], { queryParams: { type } });
      } else {
        this.router.navigate([node.route]);
      }
      this.openPath = [];
    } else if (node.children?.length) {
      this.setOpenPath(node);
    } else {
      this.openPath = [];
    }
  }

  setActive(nodeId: number) {
    this.activeNodeId = nodeId;
  }

  setOpenPath(node: MenuNode) {
    const path = this.findPathToNode(this.menuTree, node.id);
    this.openPath = path ?? [];
  }

  clearOpenPath() {
    // Schedule the close with a delay to allow moving to popup
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
    }
    this.closeMenuTimeout = setTimeout(() => {
      this.openPath = [];
      this.hoveredNodeAtLevel.clear();
      this.popupTopPosition.clear();
      this.closeMenuTimeout = undefined;
    }, 300); // 300ms delay allows smooth transition to popups
  }

  private findPathToNode(nodes: MenuNode[], id: number, currentPath: MenuNode[] = []): MenuNode[] | undefined {
    for (const node of nodes) {
      const nextPath = [...currentPath, node];
      if (node.id === id) {
        return nextPath;
      }
      if (node.children) {
        const found = this.findPathToNode(node.children, id, nextPath);
        if (found) return found;
      }
    }
    return undefined;
  }

  getSubmenuLevels(): MenuNode[][] {
    return this.openPath
      .filter(node => node.children?.length)
      .map(node => node.children!);
  }

  getPopupLeft(level: number): number {
    const sidebarWidth = this.isSidebarCollapsed ? 70 : 260;
    const popupSpacing = 220;
    return sidebarWidth + level * popupSpacing;
  }

  getPopupTop(level: number): number {
    return this.popupTopPosition.get(level) ?? 0;
  }

  private normalizeToNode(item: any): MenuNode {
    const id = item.menuId ?? item.subMenuId ?? 0;
    const name = item.menuName ?? item.subMenuName ?? '';
    const icon = item.icon;
    const isParent = item.isParent ?? item.isParent ?? false;
    const route = item.route;

    const childrenRaw: any[] = [];
    if (Array.isArray(item.subMenus)) {
      childrenRaw.push(...item.subMenus);
    }
    if (Array.isArray(item.childSubMenus)) {
      childrenRaw.push(...item.childSubMenus);
    }

    const children = childrenRaw
      .filter(Boolean)
      .map(c => this.normalizeToNode(c));
    
    return {
      id,
      name,
      icon,
      isParent,
      route,
      children: children.length ? children : undefined
    };
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  logout() {
    const refreshToken = localStorage.getItem('refreshToken') ?? '';
    this.authService.logout({ refreshToken }).subscribe({
      next: () => {
        localStorage.clear();
        this.router.navigate(['login']);
      },
      error: () => {
        localStorage.clear();
        this.router.navigate(['login']);
      }
    });
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  private findNodeById(nodes: MenuNode[], id?: number): MenuNode | undefined {
    if (!id) return undefined;
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  getActivePageTitle() {
    const activeNode = this.findNodeById(this.menuTree, this.activeNodeId);
    return activeNode?.name ?? '';
  }

}

