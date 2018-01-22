/**
 * UI Navigation links
 */
// todo: delete file
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
		'tplPath': 'modules/dashboard/myAccount/directives/login.tmpl',
		'scripts': ['modules/dashboard/myAccount/config.js', 'modules/dashboard/myAccount/controller.js']
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
			'method': 'get',
			'route': '/environment/list'
		},
		'scripts': ['modules/dashboard/home/config.js', 'modules/dashboard/home/controller.js'],
		'tplPath': 'modules/dashboard/home/directives/noenv.tmpl'
	}
];