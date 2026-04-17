import { MenuItem } from '../models/menu';

export const MENU_INFO: MenuItem[] = [
    {
        "menuId": 1,
        "menuName": "ServiceCentral",
        "isActive": true,
        "enableForRoles": ["Admin", "Agent"],
        "icon" : "🗐",
        "isParent": true,
        "subMenus": [
            {
                "subMenuId": 101,
                "subMenuName": "RITM",
                "isActive": true,
                "enableForRoles": ["Admin"],
                "route": "/welcome",
                "childSubMenus": []
            },
            {
                "subMenuId": 102,
                "subMenuName": "Incident",
                "isActive": true,
                "enableForRoles": ["Admin", "Agent"],
                "route": "/welcome",
                "childSubMenus": []
            }
        ]
    },
    {
        "menuId": 2,
        "menuName": "Settings",
        "isActive": true,
        "enableForRoles": ["Admin"],
        "icon": "⚙️",
        "isParent": true,
        "subMenus": [
        {
            "subMenuId": 201,
            "subMenuName": "General",
            "isActive": true,
            "enableForRoles": ["Admin"],
            "childSubMenus": [
            {
                "subMenuId": 20101,
                "subMenuName": "Organisation Setup",
                "isActive": true,
                "childSubMenus": [
                {
                    "subMenuId": 2010101,
                    "subMenuName": "Define",
                    "isActive": true,
                    "enableForRoles": ["Admin"],
                    "childSubMenus": [
                    {
                        "subMenuId": 201010101,
                        "subMenuName": "Company",
                        "isActive": true,
                        "enableForRoles": ["Admin"],
                        "childSubMenus": [
                        {
                            "subMenuId": 20101010101,
                            "subMenuName": "Requestor",
                            "route": "/company/requestor",
                            "isActive": true,
                            "enableForRoles": ["Admin"],
                            "childSubMenus": []
                        },
                        {
                            "subMenuId": 20101010102,
                            "subMenuName": "Service Provider",
                            "route": "/company/service-provider",
                            "isActive": true,
                            "enableForRoles": ["Admin"],
                            "childSubMenus": []
                        }
                        ]
                    },
                    {
                        "subMenuId": 201010102,
                        "subMenuName": "Plant",
                        "route": "/plant",
                        "isActive": true,
                        "enableForRoles": ["Admin"],
                        "childSubMenus": []
                    },
                    {
                        "subMenuId": 201010103,
                        "subMenuName": "Skills",
                        "route": "/skill",
                        "isActive": true,
                        "enableForRoles": ["Admin"],
                        "childSubMenus": []
                    }
                    ]
                }
                ]
            },
            {
                "subMenuId": 20102,
                "subMenuName": "Master",
                "isActive": true,
                "enableForRoles": ["Admin"],
                "childSubMenus": [
                {
                    "subMenuId": 2010201,
                    "subMenuName": "Agent",
                    "route": "/agent",
                    "isActive": true,
                    "enableForRoles": ["Admin"],
                    "childSubMenus": []
                },
                {
                    "subMenuId": 2010202,
                    "subMenuName": "Calendar",
                    "isActive": true,
                    "enableForRoles": ["Admin"],
                    "childSubMenus": [
                    {
                        "subMenuId": 201020201,
                        "subMenuName": "Define",
                        "isActive": true,
                        "enableForRoles": ["Admin"],
                        "childSubMenus": [
                        {
                            "subMenuId": 20102020101,
                            "subMenuName": "Create Support Calendar",
                            "route": "/calendar/create-calendar",
                            "isActive": true,
                            "enableForRoles": ["Admin"],
                            "childSubMenus": []
                        },
                        {
                            "subMenuId": 20102020102,
                            "subMenuName": "Create Requestor Calendar",
                            "route": "/calendar/create-calendar",
                            "isActive": true,
                            "enableForRoles": ["Admin"],
                            "childSubMenus": []
                        },
                        {
                            "subMenuId": 20102020103,
                            "subMenuName": "List",
                            "route": "/calendar/list",
                            "isActive": true,
                            "enableForRoles": ["Admin"],
                            "childSubMenus": []
                        }
                        ]
                    }
                    ]
                },
                {
                    "subMenuId": 2010203,
                    "subMenuName": "Priority",
                    "isActive": true,
                    route: "/priority",
                    "enableForRoles": ["Admin"],
                    "childSubMenus": []
                }
                ]
            }
            ]
        }        
        ]
    }
];

export const APP_CONSTANTS = {
  APP_NAME: 'FlickzzDesk',
  API_BASE_URL: 'http://localhost:5000/flickzz-desk'
};

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TIMEZONES = ['UTC', 'EST', 'CST', 'MST', 'PST', 'GMT', 'CET', 'IST', 'JST', 'AEST'];