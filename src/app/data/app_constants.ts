import { MenuItem } from '../models/menu';

export const MENU_INFO: MenuItem[] = [
    {
        "menuId": 1,
        "menuName": "ServiceCentral",
        "isActive": true,
        "enableForRoles": ["Agent"],
        "icon" : "🗐",
        "isParent": true,
        "subMenus": [
            {
                "subMenuId": 101,
                "subMenuName": "RITM",
                "isActive": true,
                "enableForRoles": ["Agent"],
                "route": "/ritm",
                "childSubMenus": []
            },
            {
                "subMenuId": 102,
                "subMenuName": "Incident",
                "isActive": true,
                "enableForRoles": ["Agent"],
                "route": "/welcome",
                "childSubMenus": []
            }
        ]
    },
    {
        "menuId": 2,
        "menuName": "Settings",
        "isActive": true,
        "enableForRoles": ["Agent"],
        "icon": "⚙️",
        "route": "/settings",
        "isParent": true,
        "subMenus": [
            {
                "subMenuId": 201,
                "subMenuName": "General",
                "isActive": true,
                "enableForRoles": ["Agent"],
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
                        "enableForRoles": ["Agent"],
                        "childSubMenus": [
                        {
                            "subMenuId": 201010101,
                            "subMenuName": "Company",
                            "isActive": true,
                            "enableForRoles": ["Agent"],
                            "childSubMenus": [
                            {
                                "subMenuId": 20101010101,
                                "subMenuName": "Requestor",
                                "route": "/company/requestor",
                                "isActive": true,
                                "enableForRoles": ["Agent"],
                                "childSubMenus": []
                            },
                            {
                                "subMenuId": 20101010102,
                                "subMenuName": "Service Provider",
                                "route": "/company/service-provider",
                                "isActive": true,
                                "enableForRoles": ["Agent"],
                                "childSubMenus": []
                            }
                            ]
                        },
                        {
                            "subMenuId": 201010102,
                            "subMenuName": "Plant",
                            "route": "/plant",
                            "isActive": true,
                            "enableForRoles": ["Agent"],
                            "childSubMenus": []
                        },
                        {
                            "subMenuId": 201010103,
                            "subMenuName": "Skills",
                            "route": "/skill",
                            "isActive": true,
                            "enableForRoles": ["Agent"],
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
                    "enableForRoles": ["Agent"],
                    "childSubMenus": [
                    {
                        "subMenuId": 2010201,
                        "subMenuName": "Agent",
                        "route": "/agent",
                        "isActive": true,
                        "enableForRoles": ["Agent"],
                        "childSubMenus": []
                    },
                    {
                        "subMenuId": 2010202,
                        "subMenuName": "Calendar",
                        "isActive": true,
                        "enableForRoles": ["Agent"],
                        "childSubMenus": [
                        {
                            "subMenuId": 201020201,
                            "subMenuName": "Define",
                            "isActive": true,
                            "enableForRoles": ["Agent"],
                            "childSubMenus": [
                            {
                                "subMenuId": 20102020101,
                                "subMenuName": "Create Support Calendar",
                                "route": "/calendar/create-calendar",
                                "isActive": true,
                                "enableForRoles": ["Agent"],
                                "childSubMenus": []
                            },
                            {
                                "subMenuId": 20102020102,
                                "subMenuName": "Create Requestor Calendar",
                                "route": "/calendar/create-calendar",
                                "isActive": true,
                                "enableForRoles": ["Agent"],
                                "childSubMenus": []
                            },
                            {
                                "subMenuId": 20102020103,
                                "subMenuName": "List",
                                "route": "/calendar/list",
                                "isActive": true,
                                "enableForRoles": ["Agent"],
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
                        "enableForRoles": ["Agent"],
                        "childSubMenus": []
                    }
                    ]
                }
                ]
            },
            {
                "subMenuId": 202,
                "subMenuName": "Service Config",
                "isActive": true,
                "enableForRoles": ["Agent"],
                "childSubMenus": [
                    {
                        "subMenuId": 20201,
                        "subMenuName": "Business Offering",
                        "route": "/business-offering",
                        "isActive": true,
                        "enableForRoles": ["Agent"],
                        "childSubMenus": []
                    }
                ]
            },
            {
                "subMenuId": 203,
                "subMenuName": "Task",
                "isActive": true,
                "enableForRoles": ["Agent"],
                "childSubMenus": [
                    {
                        "subMenuId": 20301,
                        "subMenuName": "Number Range",
                        "route": "/number-range",
                        "isActive": true,
                        "enableForRoles": ["Agent"],
                        "childSubMenus": []
                    }
                ]
            },
            {
            "subMenuId": 204,
            "subMenuName": "Impact",
            "isActive": true,
            "enableForRoles": ["Agent"], 
            "route": "/impact",  
            "childSubMenus": []
            }
        ]
    },
    {
        "menuId": 3,
        "menuName": "Settings",
        "isActive": true,
        "enableForRoles": ["Admin"],
        "icon": "⚙️",
        "route": "/settings",
        "isParent": true,
        "subMenus": []
    }
];

export const APP_CONSTANTS = {
  APP_NAME: 'FlickzzDesk',
  API_BASE_URL: 'http://localhost:5000/flickzz-desk'
};

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TIMEZONES = ['UTC', 'EST', 'CST', 'MST', 'PST', 'GMT', 'CET', 'IST', 'JST', 'AEST'];