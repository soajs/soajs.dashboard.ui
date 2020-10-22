'use strict';

let infraNav = [
	{
		'id': 'infra-providers',
		'label': 'Settings',
		'checkPermission': {
			'service': 'infra',
			'route': '/account/kubernetes',
			'method': 'get'
		},
		'url': '#/infra',
		'tplPath': 'modules/dashboard/infra/main/directives/list.tmpl',
		'icon': 'cog',
		'pillar': {
			'name': 'infra',
			'label': "Infrastructure",
			'position': 0
		},
		'mainMenu': true,
		'tracker': true,
		'order': 1,
		'scripts': ['modules/dashboard/infra/config.js', 'modules/dashboard/infra/_services/infra.js', 'modules/dashboard/infra/main/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'infra-namespace',
		'label': 'Namespaces',
		'checkPermission': {
			'service': 'infra',
			'route': '/account/kubernetes',
			'method': 'get'
		},
		'url': '#/infra-namespaces',
		'tplPath': 'modules/dashboard/infra/namespace/directives/list.tmpl',
		'icon': 'insert-template',
		'pillar': {
			'name': 'infra',
			'label': "Infrastructure",
			'position': 0
		},
		'mainMenu': true,
		'tracker': true,
		'fallbackLocation': "#/infra",
		'order': 2,
		'scripts': ['modules/dashboard/infra/config.js', 'modules/dashboard/infra/namespace/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'infra-acl-settings',
		'checkPermission': {
			'service': 'infra',
			'route': '/account/kubernetes/acl',
			'method': 'put'
		},
		'label': "Infra Acl",
		'url': '#/infra/configDetailView/:id',
		'tplPath': 'modules/dashboard/infra/infraDetailView/directives/configDetailView.tmpl',
		'icon': 'sphere',
		'pillar': {
			'name': 'infra',
			'label': "Infrastructure",
			'position': 0
		},
		'scripts': [
			'modules/dashboard/infra/infraDetailView/controller.js',
		],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(infraNav);
