'use strict';

var catalogNav = [
    {
        'id': 'analyticDashboard',
        'label': "Dashboard Analytics",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/dashboard',
            'method': 'get'
        },
        'url': '#/analytics',
        'tplPath': 'modules/dashboard/analyticDashboard/directives/list.tmpl',
        'icon': 'file-text2',
        'pillar': {
            'name': 'dashboard',
            'label': translation.dashboard[LANG],
            'position': 5
        },
        'mainMenu': true,
        'tracker': false,
        'order': 5,
        'scripts': ['modules/dashboard/analyticDashboard/config.js', 'modules/dashboard/analyticDashboard/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];

navigation = navigation.concat(catalogNav);