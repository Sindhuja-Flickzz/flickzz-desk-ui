import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
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
  allMenuTree: MenuNode[] = [];
  menuTree: MenuNode[] = [];

  activeRoute = '';
  activeNodeId?: number;
  showSidebar = false;

  isPopupOpen = false;
  activePopupBranch: MenuNode[] = [];
  private popupCloseTimeout?: any;

  settingsOnlyMode = false;
  settingsNodeId?: number;

  expandedNodeIds = new Set<number>();
  private closeMenuTimeout?: any;

  private routerSub?: Subscription;

  // Drag-to-resize properties
  defaultSidebarWidth = 260;
  collapsedWidth = 60;
  sidebarWidth = 260;
  minSidebarWidth = 200;
  maxSidebarWidth = 500;
  isResizing = false;
  startX = 0;
  startWidth = 0;
  isHoveringRightEdge!: boolean;

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
        // Update active route
        this.activeRoute = event.url;

        // Show sidebar for authenticated routes only
        const show = !!localStorage.getItem('token') && !event.url.startsWith('/login') && !event.url.startsWith('/register');
        this.showSidebar = show;
        if (show) {
          this.loadMenu();
        }

        // Close mobile menu on route change
        this.isMobileMenuOpen = false;
        
        // Reset sidebar width to default when not collapsed
        if (!this.isSidebarCollapsed) {
          this.sidebarWidth = this.defaultSidebarWidth;
        }
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  // Drag-to-resize methods
  onResizeStart(event: MouseEvent) {
    // Don't allow resizing when sidebar is collapsed
    if (this.isSidebarCollapsed) {
      return;
    }
    
    // Check if clicking on the right edge (within 10px of the right side)
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const isRightEdge = event.clientX > rect.right - 10;

    if (isRightEdge) {
      this.isResizing = true;
      this.startX = event.clientX;
      this.startWidth = this.sidebarWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isResizing) return;
    
    // Disable resize handle when sidebar is collapsed
    if (this.isSidebarCollapsed) {
      document.body.style.cursor = '';
      this.isHoveringRightEdge = false;
      return;
    }

    // Check if hovering over the right edge
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const isRightEdge = event.clientX > rect.right - 10;
    this.isHoveringRightEdge = isRightEdge;

    if (isRightEdge) {
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = '';
    }
  }

  onMouseLeave() {
    if (!this.isResizing) {
      this.isHoveringRightEdge = false;
      document.body.style.cursor = '';
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onResizeMove(event: MouseEvent) {
    if (!this.isResizing) return;

    const deltaX = event.clientX - this.startX;
    const newWidth = Math.max(this.minSidebarWidth, Math.min(this.maxSidebarWidth, this.startWidth + deltaX));
    this.sidebarWidth = newWidth;
  }

  @HostListener('document:mouseup')
  onResizeEnd() {
    if (!this.isResizing) return;

    this.isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // If collapsed, ensure width stays at collapsedWidth
    if (this.isSidebarCollapsed) {
      this.sidebarWidth = this.collapsedWidth;
    }
  }

  loadMenu() {
    this.menuItems = MENU_INFO.filter(m => m.isActive);
    this.allMenuTree = this.menuItems.map(m => this.normalizeToNode(m));
    this.menuTree = [...this.allMenuTree];

    const settingsNode = this.findNodeByName(this.allMenuTree, 'Settings');
    this.settingsNodeId = settingsNode?.id;

    if (this.settingsOnlyMode) {
      this.enterSettingsMode();
    }
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

    if (node.isParent && node.name === 'Settings') {
      if (!this.settingsOnlyMode) {
        this.enterSettingsMode(node);
      } else {
        // allow collapse/expand in settings-only mode if needed
        this.toggleExpansion(node);
      }
      this.setActive(node.id);
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

  get menuPopupRows(): MenuNode[][] {
    const rows: MenuNode[][] = [];
    rows.push(this.menuTree);

    for (let i = 0; i < this.activePopupBranch.length; i++) {
      const node = this.activePopupBranch[i];
      if (node.children && node.children.length) {
        rows.push(node.children);
      } else {
        break;
      }
    }

    return rows;
  }

  isPopupSelected(node: MenuNode, level: number): boolean {
    return this.activePopupBranch[level]?.id === node.id;
  }

  openPopup() {
    this.isPopupOpen = true;
    this.activePopupBranch = [];
    if (this.popupCloseTimeout) {
      clearTimeout(this.popupCloseTimeout);
      this.popupCloseTimeout = undefined;
    }
  }

  closePopup() {
    this.isPopupOpen = false;
    this.activePopupBranch = [];
    if (this.popupCloseTimeout) {
      clearTimeout(this.popupCloseTimeout);
      this.popupCloseTimeout = undefined;
    }
  }

  closePopupWithDelay() {
    if (this.popupCloseTimeout) {
      clearTimeout(this.popupCloseTimeout);
    }
    this.popupCloseTimeout = setTimeout(() => {
      this.closePopup();
    }, 250);
  }

  onPopupAreaHover() {
    if (this.popupCloseTimeout) {
      clearTimeout(this.popupCloseTimeout);
      this.popupCloseTimeout = undefined;
    }
  }

  setPopupBranch(node: MenuNode, level: number) {
    this.activePopupBranch = this.activePopupBranch.slice(0, level);
    this.activePopupBranch[level] = node;
  }

  onPopupItemHover(node: MenuNode, level: number) {
    if (!node.isActive) {
      return;
    }
    this.setPopupBranch(node, level);
  }

  onPopupItemClick(node: MenuNode, level: number, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    if (!node.isActive) {
      return;
    }

    this.setPopupBranch(node, level);

    if (!node.children || !node.children.length) {
      if (node.route) {
        if (node.route === '/calendar/create-calendar') {
          const type = node.name?.toLowerCase().includes('requestor') ? 'requestor' : 'support';
          this.router.navigate([node.route], { queryParams: { type } });
        } else {
          this.router.navigate([node.route]);
        }
      }
      this.closePopup();
      return;
    }
  }

  togglePopup() {
    if (this.isPopupOpen) {
      this.closePopup();
    } else {
      this.openPopup();
    }
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
    // When collapsing, set width to collapsedWidth (60px), overriding any drag-resize
    // When expanding, restore to default width
    this.sidebarWidth = this.isSidebarCollapsed ? this.collapsedWidth : this.defaultSidebarWidth;
  }

  toggleToNormal() {
    this.isSidebarCollapsed ? this.toggleSidebar() : this.isSidebarCollapsed;
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

  private findNodeByName(nodes: MenuNode[], name: string): MenuNode | undefined {
    for (const node of nodes) {
      if (node.name === name) return node;
      if (node.children) {
        const found = this.findNodeByName(node.children, name);
        if (found) return found;
      }
    }
    return undefined;
  }

  enterSettingsMode(settingsNode?: MenuNode) {
    const settingsRoot = settingsNode || this.findNodeByName(this.allMenuTree, 'Settings');
    if (!settingsRoot) { return; }

    this.settingsOnlyMode = true;
    this.settingsNodeId = settingsRoot.id;

    // Show only Settings root and its descendants
    this.menuTree = [settingsRoot];
    this.expandedNodeIds.clear();
    this.expandedNodeIds.add(settingsRoot.id);
    this.activeNodeId = settingsRoot.id;
  }

  exitSettingsMode() {
    this.settingsOnlyMode = false;
    this.menuTree = [...this.allMenuTree];
    this.expandedNodeIds.clear();
    this.activeNodeId = undefined;
  }

  getActivePageTitle() {
    const activeNode = this.findNodeById(this.menuTree, this.activeNodeId);
    return activeNode?.name ?? '';
  }

}

