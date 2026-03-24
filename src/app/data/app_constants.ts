import { MenuItem } from '../models/menu';

export const MENU_INFO: MenuItem[] = [
    {
        "menuId": 1,
        "menuName": "Ticketing",
        "isActive": true,
        "icon" : "🗐",
        "isParent": true,
        "subMenus": [
            {
                "subMenuId": 101,
                "subMenuName": "Create Ticket",
                "isActive": true,
                "childSubMenus": [
                    {
                        "subMenuId": 10101,
                        "subMenuName": "Incident Ticket",
                        "route": "/welcome",
                        "isActive": true,
                        "childSubMenus": []
                    },
                    {
                        "subMenuId": 10102,
                        "subMenuName": "Service Request",
                        "route": "/welcome",
                        "isActive": true,
                        "childSubMenus": []
                    }
                ]
            }
        ]
    },
    {
        "menuId": 2,
        "menuName": "Settings",
        "isActive": true,
        "icon" : "⚙️",
        "isParent": true,
        "subMenus": [
            {
                "subMenuId": 201,
                "subMenuName": "Organization Setup",
                "isActive": true,
                "childSubMenus": [{
                        "subMenuId": 20101,
                        "subMenuName": "Calendar",
                        "isActive": true,
                        "childSubMenus": [
                            {
                                "subMenuId": 2010101,
                                "subMenuName": "Define Calendar",
                                "isActive": true,
                                "childSubMenus": [
                                    {
                                        "subMenuId": 201010101,
                                        "subMenuName": "Create Support Calendar",
                                        "isActive": true,
                                        "route": "/calendar/create-support-calendar",
                                        "childSubMenus": []
                                    },
                                    {
                                        "subMenuId": 201010102,
                                        "subMenuName": "Create Custom Calendar",
                                        "route": "/welcome",
                                        "isActive": true,
                                        "childSubMenus": []
                                    },
                                    {
                                        "subMenuId": 2010103,
                                        "subMenuName": "List",
                                        "route": "/welcome",
                                        "isActive": true,
                                        "childSubMenus": []
                                    }
                                ]
                            },
                            {
                                "subMenuId": 20102,
                                "subMenuName": "Assign Calendar",
                                "route": "/welcome",
                                "isActive": true,
                                "childSubMenus": []
                            }
                        ]
                    }]
            }
        ]
    }
]

export const APP_CONSTANTS = {
  APP_NAME: 'FlickzzDesk',
  API_BASE_URL: '/flickzz-desk'
};

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TIMEZONES = ['UTC', 'EST', 'CST', 'MST', 'PST', 'GMT', 'CET', 'IST', 'JST', 'AEST'];