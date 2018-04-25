'use strict';

let infraNav = [
	{
		'id': 'infra-providers',
		'label': 'Infra Providers',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/infra',
			'method': 'get'
		},
		'url': '#/infra',
		'tplPath': 'modules/dashboard/infra/directives/list.tmpl',
		'icon': 'cog',
		'pillar': {
			'name': 'development',
			'label': translation.develop[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'order': 7,
		'scripts': [ 'modules/dashboard/infra/config.js', 'modules/dashboard/infra/services/infra.js', 'modules/dashboard/infra/controller.js' ],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(infraNav);