'use strict';

var volumesNav = [
    {
        'id': 'volumes',
        'label': "Volumes",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/volumes/list',
            'method': 'get'
        },
	    "fallbackLocation": "#/environments",
        'url': '#/volumes',
        'tplPath': 'modules/dashboard/volumes/directives/list.tmpl',
        'icon': 'folder',
        'pillar': {
            'name': 'deployment',
            'label': translation.secrets[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 5,
        'scripts': ['modules/dashboard/volumes/config.js', 'modules/dashboard/volumes/controller.js', 'modules/dashboard/volumes/services/volumesService.js'],
        'ancestor': [translation.home[LANG]]
    }
];

navigation = navigation.concat(volumesNav);
