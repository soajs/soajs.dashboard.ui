/**
 * UI Navigation links
 */

var navigation = [
	{
		'id': 'home',
		'label': translation.home[LANG],
		'url': '#/dashboard',
		'tplPath': 'modules/dashboard/home/directives/dashboard.tmpl',
		'scripts': ['modules/dashboard/home/config.js', 'modules/dashboard/home/controller.js'],
		'footerMenu': true,
		'tracker': true
	},
	{
		'id': 'login',
		'label': translation.home[LANG],
		'url': '#/login',
		'tplPath': 'engine/modules/myAccount/directives/login.tmpl',
		'scripts': ['engine/modules/myAccount/config.js', 'engine/modules/myAccount/controller.js']
	},
	{
		'id': 'noEnv',
		'label': 'No Environment Found',
		'url': '#/home/env',
		'pillar': {
			'name': 'deploy',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'order': 2,
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/list'
		},
		'scripts': ['modules/dashboard/home/config.js', 'modules/dashboard/home/controller.js'],
		'tplPath': 'modules/dashboard/home/directives/noenv.tmpl'
	},
	{
		'id': 'help2',
		'label': translation.help[LANG],
		'url': '#/help',
		'scripts': ['modules/dashboard/home/config.js', 'modules/dashboard/home/controller.js'],
		'tplPath': 'modules/dashboard/home/directives/help.tmpl',
		'footerMenu': true
	}
];