"use strict";

var membersNav = [
	// {
	// 	'id': 'tenants-members',
	// 	'label': translation.tenantUser[LANG],
	// 	'checkPermission': {
	// 		'service': 'dashboard',
	// 		'route': '/tenant/list',
	// 		'method':'get'
	// 	},
	// 	'url': '#/members',
	// 	'tplPath': 'modules/dashboard/members/directives/tenant.tmpl',
	// 	'icon': 'users',
	// 	'mainMenu': true,
	// 	'pillar': {
	// 		'name': 'management',
	// 		'label': translation.manage[LANG],
	// 		'position': 2
	// 	},
	// 	'tracker': true,
	// 	'order': 3,
	// 	'scripts': [
	// 		'modules/dashboard/members/config.js',
	// 		'modules/dashboard/members/controller.js',
	// 		'modules/dashboard/members/services/members.js',
	// 		'modules/dashboard/members/services/groups.js'],
	// 	'ancestor': [translation.home[LANG]]
	// },
	{
		'id': 'console-members',
		'label': translation.consoleUsers[LANG],
		'checkPermission': {
			'service': 'dashboard',
			'route': 'console/tenant/list',
			'method':'get'
		},
		'url': '#/tenants-members',
		'tplPath': 'modules/dashboard/members/directives/consoleTenant.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'tracker': true,
		'order': 8,
		'scripts': ['modules/dashboard/members/config.js', 
			'modules/dashboard/members/controller.js', 'modules/dashboard/members/services/members.js', 
			'modules/dashboard/members/services/groups.js'],
		'ancestor': [translation.home[LANG]]
	},
	// {
	// 	'id': 'user-acl',
	// 	'label': translation.userACL[LANG],
	// 	'url': '#/members/:uId/editUserAcl',
	// 	'tplPath': 'modules/dashboard/members/directives/editUserAcl.tmpl',
	// 	'tracker': true,
	// 	'checkPermission': {
	// 		'service': 'urac',
	// 		'route': '/admin/editUser',
	// 		'method' : 'post'
	// 	},
	// 	'pillar': {
	// 		'name': 'management',
	// 		'label': translation.manage[LANG],
	// 		'position': 2
	// 	},
	// 	'scripts': ['modules/dashboard/members/config.js',
	// 		'modules/dashboard/members/controller.js',
	// 		'modules/dashboard/members/services/acl.js'],
	// 	'ancestor': [translation.home[LANG], translation.member[LANG]]
	// },
	{
		'id': 'user-console-acl',
		'label': translation.userACL[LANG],
		'url': '#/tenants-members/:uId/editConsoleUserAcl',
		'tplPath': 'modules/dashboard/members/directives/editConsoleUserAcl.tmpl',
		'tracker': true,
		'checkPermission': {
			'service': 'urac',
			'route': 'console/tenant/list',
			'method' : 'post'
		},
		'pillar': {
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'scripts': ['modules/dashboard/members/config.js',
			'modules/dashboard/members/controller.js',
			'modules/dashboard/members/services/acl.js'],
		'ancestor': [translation.home[LANG], translation.member[LANG]]
	}
];
navigation = navigation.concat(membersNav);