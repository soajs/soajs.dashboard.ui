'use strict';

var importNav = [
    {
        'id': 'importExport',
        'label': "Import/Export",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/templates/import',
            'method': 'get'
        },
        'url': '#/importExport',
        'tplPath': 'modules/dashboard/importExport/directives/list.tmpl',
        'icon': 'folder',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 7,
        'scripts': ['modules/dashboard/importExport/config.js', 'modules/dashboard/importExport/controller.js', 'modules/dashboard/importExport/service.js'],
        'ancestor': [translation.home[LANG]]
    }
];

navigation = navigation.concat(importNav);
