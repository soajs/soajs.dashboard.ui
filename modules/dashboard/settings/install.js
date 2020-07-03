'use strict';

var settingsNav = [
	/*
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
	},*/
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
	{
		'id': 'continuous-delivery',
		'label': "Continuous Delivery",
		'checkPermission': {
			'service': 'infra',
			'route': '/cd/tokens',
			'method': 'get'
		},
		'url': '#/continuous-delivery',
		'tplPath': 'modules/dashboard/settings/cd/directives/cd.tmpl',
		'icon': 'file-text2',
		'pillar': {
			'name': 'settings',
			'label': translation.settings[LANG],
			'position': 6
		},
		'mainMenu': true,
		'tracker': true,
		'order': 3,
		'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/cd/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
];

navigation = navigation.concat(settingsNav);