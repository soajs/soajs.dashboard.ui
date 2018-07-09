'use strict';

let infraNav = [
	{
		'id': 'infra-providers',
		'label': 'Settings',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/infra',
			'method': 'get'
		},
		'url': '#/infra',
		'tplPath': 'modules/dashboard/infra/main/directives/list.tmpl',
		'icon': 'codepen',
		'pillar': {
			'name': 'infra',
			'label': "Infrastructure",
			'position': 0
		},
		'mainMenu': true,
		'tracker': true,
		'order': 1,
		'scripts': [ 'modules/dashboard/infra/main/config.js', 'modules/dashboard/infra/main/services/infra.js', 'modules/dashboard/infra/main/controller.js' ],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'infra-providers',
		'label': 'Deployments',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/infra',
			'method': 'get'
		},
		'url': '#/infra-deployments',
		'tplPath': 'modules/dashboard/infra/deployments/directives/list.tmpl',
		'icon': 'codepen',
		'pillar': {
			'name': 'infra',
			'label': "Infrastructure",
			'position': 0
		},
		'mainMenu': true,
		'tracker': true,
		'order': 2,
		"fallbackLocation": "#/infra",
		'scripts': [ 'modules/dashboard/infra/deployments/config.js', 'modules/dashboard/infra/deployments/services/infra.js', 'modules/dashboard/infra/deployments/controller.js' ],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'infra-templates',
		'label': 'Infra Code Templates',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/infra',
			'method': 'get'
		},
		'url': '#/infra-templates',
		'tplPath': 'modules/dashboard/infra/iac/directives/list.tmpl',
		'icon': 'codepen',
		'pillar': {
			'name': 'infra',
			'label': "Infrastructure",
			'position': 0
		},
		'mainMenu': true,
		'tracker': true,
		'order': 3,
		"fallbackLocation": "#/infra",
		'scripts': [ 'modules/dashboard/infra/iac/config.js', 'modules/dashboard/infra/iac/services/infra.js', 'modules/dashboard/infra/iac/controller.js' ],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(infraNav);