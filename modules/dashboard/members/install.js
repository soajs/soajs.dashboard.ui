"use strict";

var membersNav = [
	{
		'id': 'tenants-members',
		'label': translation.tenantOrganizationChart[LANG],
		'checkPermission': {
			'service': 'urac',
			'route': '/admin/all',
			'method':'get'
		},
		'url': '#/tenants-members',
		'tplPath': 'modules/dashboard/members/directives/tenant.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'tracker': true,
		'order': 3,
		'scripts': [
			'modules/dashboard/members/config.js',
			'modules/dashboard/members/controller.js',
			'modules/dashboard/members/services/members.js',
			'modules/dashboard/members/services/groups.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'members',
		'label': translation.myOrganizationChart[LANG],
		'checkPermission': {
			'service': 'urac',
			'route': '/admin/listUsers',
			'method':'get'
		},
		'url': '#/members',
		'tplPath': 'modules/dashboard/members/directives/list.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'tracker': true,
		'order': 4,
		'scripts': ['modules/dashboard/members/config.js', 
			'modules/dashboard/members/controller.js', 'modules/dashboard/members/services/members.js', 
			'modules/dashboard/members/services/groups.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'user-acl',
		'label': translation.userACL[LANG],
		'url': '#/members/:uId/editUserAcl',
		'tplPath': 'modules/dashboard/members/directives/editUserAcl.tmpl',
		'tracker': true,
		'checkPermission': {
			'service': 'urac',
			'route': '/admin/editUser',
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