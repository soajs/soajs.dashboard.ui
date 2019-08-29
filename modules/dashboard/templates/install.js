'use strict';

var templatesNav = [
    {
        'id': 'templates',
        'label': "Environment Catalog",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/templates',
            'method': 'get'
        },
        'url': '#/templates',
        'tplPath': 'modules/dashboard/templates/directives/list.tmpl',
        'icon': 'folder',
        'pillar': {
            'name': 'catalogs',
            'label': translation.catalogs[LANG],
            'position': 4
        },
        'mainMenu': true,
        'tracker': true,
        'order': 4,
        'scripts': ['modules/dashboard/templates/config.js', 'modules/dashboard/templates/controller.js', 'modules/dashboard/templates/service.js'],
        'ancestor': [translation.home[LANG]]
    }
];

navigation = navigation.concat(templatesNav);
