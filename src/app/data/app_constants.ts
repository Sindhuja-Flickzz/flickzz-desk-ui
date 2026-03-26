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
        "icon": "⚙️",
        "isParent": true,
        "subMenus": [
        {
            "subMenuId": 201,
            "subMenuName": "General",
            "isActive": true,
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
                    "childSubMenus": [
                    {
                        "subMenuId": 201010101,
                        "subMenuName": "Company",
                        "isActive": true,
                        "childSubMenus": [
                        {
                            "subMenuId": 20101010101,
                            "subMenuName": "Requestor",
                            "route": "/welcome",
                            "isActive": true,
                            "childSubMenus": []
                        },
                        {
                            "subMenuId": 20101010102,
                            "subMenuName": "Service Provider",
                            "route": "/welcome",
                            "isActive": true,
                            "childSubMenus": []
                        }
                        ]
                    },
                    {
                        "subMenuId": 201010102,
                        "subMenuName": "Plant",
                        "route": "/welcome",
                        "isActive": true,
                        "childSubMenus": []
                    },
                    {
                        "subMenuId": 201010103,
                        "subMenuName": "Skills",
                        "route": "/welcome",
                        "isActive": true,
                        "childSubMenus": []
                    }
                    ]
                }
                ]
            }
            ]
        },
        {
            "subMenuId": 202,
            "subMenuName": "Master",
            "isActive": true,
            "childSubMenus": [
            {
                "subMenuId": 20201,
                "subMenuName": "Agent",
                "route": "/welcome",
                "isActive": true,
                "childSubMenus": []
            },
            {
                "subMenuId": 20202,
                "subMenuName": "Calendar",
                "isActive": true,
                "childSubMenus": [
                {
                    "subMenuId": 2020201,
                    "subMenuName": "Define",
                    "isActive": true,
                    "childSubMenus": [
                    {
                        "subMenuId": 202020101,
                        "subMenuName": "Create Support Calendar",
                        "route": "/calendar/create-calendar",
                        "isActive": true,
                        "childSubMenus": []
                    },
                    {
                        "subMenuId": 202020102,
                        "subMenuName": "Create Requestor Calendar",
                        "route": "/calendar/create-calendar",
                        "isActive": true,
                        "childSubMenus": []
                    },
                    {
                        "subMenuId": 202020103,
                        "subMenuName": "List",
                        "route": "/calendar/list",
                        "isActive": true,
                        "childSubMenus": []
                    }
                    ]
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