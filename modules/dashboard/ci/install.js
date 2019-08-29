'use strict';

var ciNav = [
    {
        'id': 'continuous-integration',
        'label': "Deployer Config Catalog",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/ci',
            'method': 'get'
        },
        'url': '#/continuous-integration',
        'tplPath': 'modules/dashboard/ci/directives/list.tmpl',
        'icon': 'upload',
        'pillar': {
            'name': 'catalogs',
            'label': translation.catalogs[LANG],
            'position': 3
        },
        'mainMenu': true,
        'tracker': true,
        'order': 3,
        'scripts': ['modules/dashboard/ci/config.js', 'modules/dashboard/ci/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(ciNav);
