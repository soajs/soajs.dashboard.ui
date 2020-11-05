'use strict';

let settingsNav = [
	
	{
		'id': 'release-update',
		'label': "Release update",
		'checkPermission': {
			'service': 'console',
			'route': '/release',
			'method': 'get'
		},
		'url': '#/release-update',
		'tplPath': 'modules/dashboard/settings/release/directives/list.tmpl',
		'icon': 'qrcode',
		'pillar': {
			'name': 'settings',
			'label': translation.settings[LANG],
			'position': 6
		},
		'mainMenu': true,
		'tracker': true,
		'order': 1,
		'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/release/controller.js'],
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
		'tplPath': 'modules/dashboard/settings/deployAuth/directives/list-deploy-token.tmpl',
		'icon': 'key',
		'pillar': {
			'name': 'settings',
			'label': translation.settings[LANG],
			'position': 6
		},
		'mainMenu': true,
		'tracker': true,
		'order': 2,
		'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/deployAuth/controller.js'],
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
		'icon': 'codepen',
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
	
	{
		'id': 'notification',
		'label': "Notifications",
		'checkPermission': {
			'service': 'console',
			'route': '/ledger',
			'method': 'get'
		},
		'url': '#/notifications',
		'tplPath': 'modules/dashboard/settings/notification/directives/list.tmpl',
		'icon': 'volume-high',
		'pillar': {
			'name': 'settings',
			'label': translation.settings[LANG],
			'position': 6
		},
		'mainMenu': true,
		'tracker': true,
		'order': 4,
		'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/notification/controller.js'],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(settingsNav);