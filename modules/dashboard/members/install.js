"use strict";

var mtTranslation = {
	
	"noMembersHaveBeenAddedYet": {
		"ENG": "No Tenants have been added yet. Add a tenant to enable user management.",
		"FRA": "No Tenants have been added yet. Add a tenant to enable user management."
	}
};

for (var attrname in mtTranslation) {
	translation[attrname] = mtTranslation[attrname];
}
var membersNav = [
	{
		'id': 'tenants-members',
		'label': translation.tenantUser[LANG],
		'checkPermission': {
			'service': 'dashboard',
			'route': '/tenant/list',
			'method':'get'
		},
		'url': '#/members',
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
	}
];
navigation = navigation.concat(membersNav);