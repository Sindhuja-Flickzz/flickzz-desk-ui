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
  icon?: string;
  isParent?: boolean;
  route?: string;
  isActive?: boolean;
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

  activeRoute = '';
  activeNodeId?: number;
  showSidebar = false;

  expandedNodeIds = new Set<number>();
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
  }

  loadMenu() {
    this.menuItems = MENU_INFO.filter(m => m.isActive);
    this.menuTree = this.menuItems.map(m => this.normalizeToNode(m));
  }

  refreshMenu() {
    this.activeNodeId = undefined;
    this.expandedNodeIds.clear();
    this.loadMenu();
  }

  onNodeHover(node: MenuNode, level: number = 0) {
    this.setActive(node.id);
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
      this.closeMenuTimeout = undefined;
    }
  }

  onNodeClick(node: MenuNode) {
    if (!node.isActive) {
      return;
    }

    this.setActive(node.id);
    if (node.children && node.children.length) {
      this.toggleExpansion(node);
      return;
    }

    if (node.route) {
      if (node.route === '/calendar/create-calendar') {
        const type = node.name?.toLowerCase().includes('requestor') ? 'requestor' : 'support';
        this.router.navigate([node.route], { queryParams: { type } });
      } else {
        this.router.navigate([node.route]);
      }
    }
  }

  setActive(nodeId: number) {
    this.activeNodeId = nodeId;
  }

  toggleExpansion(node: MenuNode) {
    if (this.expandedNodeIds.has(node.id)) {
      // collapse this node and descendants
      this.collapseBranch(node);
      return;
    }

    // Only one expanded branch at a time: reset and expand path to the clicked node
    const path = this.findPathToNode(this.menuTree, node.id);
    this.expandedNodeIds.clear();
    if (path) {
      path.forEach(n => this.expandedNodeIds.add(n.id));
    }
  }

  collapseBranch(node: MenuNode) {
    const nodeIdsToCollapse = new Set<number>();

    const collect = (n: MenuNode) => {
      nodeIdsToCollapse.add(n.id);
      if (n.children) {
        n.children.forEach(child => collect(child));
      }
    };

    collect(node);
    nodeIdsToCollapse.forEach(id => this.expandedNodeIds.delete(id));
  }

  isExpanded(node: MenuNode): boolean {
    return this.expandedNodeIds.has(node.id);
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

  isActive(node: MenuNode): boolean {
    if (!node.route || !this.activeRoute) {
      return false;
    }
    return this.activeRoute === node.route || this.activeRoute.startsWith(node.route);
  }

  private normalizeToNode(item: any): MenuNode {
    const id = item.menuId ?? item.subMenuId ?? 0;
    const name = item.menuName ?? item.subMenuName ?? '';
    const icon = item.icon;
    const isParent = item.isParent ?? false;
    const route = item.route;
    const isActive = item.isActive ?? true;

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
      isActive,
      children: children.length ? children : undefined
    };
  }

  onPopupHover() {
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
      this.closeMenuTimeout = undefined;
    }
  }

  clearOpenPath() {
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
    }
    this.closeMenuTimeout = setTimeout(() => {
      this.expandedNodeIds.clear();
      this.closeMenuTimeout = undefined;
    }, 300);
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

