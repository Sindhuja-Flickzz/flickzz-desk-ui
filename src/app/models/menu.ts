export interface ChildSubMenu {
  subMenuId: number;
  subMenuName: string;
  isActive: boolean;
  enableForRoles?: string[];
  route?: string;
  childSubMenus: ChildSubMenu[];
}

export interface SubMenu {
  subMenuId: number;
  subMenuName: string;
  isActive: boolean;
  enableForRoles?: string[];
  route?: string;
  childSubMenus: ChildSubMenu[];
}

export interface MenuItem {
  menuId: number;
  menuName: string;
  isActive: boolean;
  enableForRoles?: string[];
  icon?: string;
  isParent: boolean;
  subMenus: SubMenu[];
}

export interface MenuListResponse {
  attributes: MenuItem[];
  response: {
    code: string;
    title: string;
    description: string;
  };
  successCode: string;
}
