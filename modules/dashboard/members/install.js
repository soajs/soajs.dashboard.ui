"use strict";

var mtTranslation = {
	
	"noMembersHaveBeenAddedYet": {
		"ENG": "No Tenants have been added yet. Add a tenant to enable user management.",
		"FRA": "No Tenants have been added yet. Add a tenant to enable user management."
	},
	
	"noEnvironmentsHaveBeenAddedYet": {
		"ENG": "No Environments have been added yet. Add a tenant to enable user management.",
		"FRA": "No Environments have been added yet. Add a tenant to enable user management."
	},
	"pinConfiguration": {
		"ENG": "Pin Configuration",
		"FRA": "Pin Configuration"
	},
	"checkPinLogin": {
		"ENG": "Check if this user is allowed to start pin code login",
		"FRA": "check if this user is allowed to start pin code login"
	},
	"getUsers": {
		"ENG": "Get Users",
		"FRA": "Get Users"
	},
	"getGroups": {
		"ENG": "Get Groups",
		"FRA": "Get Groups"
	},
	"areYouSureWantDeletePin": {
		"ENG": "Are you sure you want to remove the pin code configuration for the selected member?",
		"FRA": "Are you sure you want to remove the pin code configuration for the selected member?",
	},
	"removePin":{
		"ENG": "Remove Pin",
		"FRA": "Remove Pin",
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