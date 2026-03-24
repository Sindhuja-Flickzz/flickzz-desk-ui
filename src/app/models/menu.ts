export interface ChildSubMenu {
  subMenuId: number;
  subMenuName: string;
  isActive: boolean;
  route?: string;
  childSubMenus: ChildSubMenu[];
}

export interface SubMenu {
  subMenuId: number;
  subMenuName: string;
  isActive: boolean;
  route?: string;
  childSubMenus: ChildSubMenu[];
}

export interface MenuItem {
  menuId: number;
  menuName: string;
  isActive: boolean;
  icon?: string;
  isParent: boolean;
  subMenus: SubMenu[];
}

export interface MenuListResponse {
  object: MenuItem[];
  response: {
    code: string;
    title: string;
    description: string;
  };
  successCode: string;
}
