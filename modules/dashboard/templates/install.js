'use strict';

var templatesNav = [
    {
        'id': 'templates',
        'label': "Templates",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/environment/templates',
            'method': 'get'
        },
        'url': '#/templates',
        'tplPath': 'modules/dashboard/templates/directives/list.tmpl',
        'icon': 'folder',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 6,
        'scripts': ['modules/dashboard/templates/config.js', 'modules/dashboard/templates/controller.js', 'modules/dashboard/templates/service.js'],
        'ancestor': [translation.home[LANG]]
    }
];

navigation = navigation.concat(templatesNav);