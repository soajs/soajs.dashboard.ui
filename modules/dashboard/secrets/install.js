'use strict';

var secretsNav = [
    {
        'id': 'secrets',
        'label': "Secrets",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/secrets',
            'method': 'get'
        },
        'url': '#/secrets',
        'tplPath': 'modules/dashboard/secrets/directives/list.tmpl',
        'icon': 'eye-blocked',
        'pillar': {
            'name': 'deploy',
            'label': translation.deploy[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 5,
        'scripts': ['modules/dashboard/secrets/config.js', 'modules/dashboard/secrets/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];

navigation = navigation.concat(secretsNav);
