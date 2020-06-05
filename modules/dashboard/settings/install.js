'use strict';

var settingsNav = [
    {
        'id': 'soajs-recipes',
        'label': "Recipes Catalog",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/catalog/recipes/list',
            'method': 'get'
        },
        'url': '#/soajs-recipes',
        'tplPath': 'modules/dashboard/settings/directives/list.tmpl',
        'icon': 'file-text2',
        'pillar': {
            'name': 'settings',
            'label': translation.settings[LANG],
            'position': 6
        },
        'mainMenu': true,
        'tracker': true,
        'order': 1,
        'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/controller.js'],
        'ancestor': [translation.home[LANG]]
    },
	{
		'id': 'release-update',
		'label': "Release update",
		'checkPermission': {
			'service': 'dashboard',
			'route': '/version',
			'method': 'get'
		},
		'url': '#/release-update',
		'tplPath': 'modules/dashboard/settings/directives/list-release.tmpl',
		'icon': 'file-text2',
		'pillar': {
			'name': 'settings',
			'label': translation.settings[LANG],
			'position': 6
		},
		'mainMenu': true,
		'tracker': true,
		'order': 2,
		'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'deploy-auth-token',
		'label': "Deployment Auth Token",
		'checkPermission': {
			'service': 'infra',
			'route': '/cd/tokens',
			'method': 'get'
		},
		'url': '#/deploy-token',
		'tplPath': 'modules/dashboard/settings/directives/list-deploy-token.tmpl',
		'icon': 'file-text2',
		'pillar': {
			'name': 'settings',
			'label': translation.settings[LANG],
			'position': 6
		},
		'mainMenu': true,
		'tracker': true,
		'order': 2,
		'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
];

navigation = navigation.concat(settingsNav);