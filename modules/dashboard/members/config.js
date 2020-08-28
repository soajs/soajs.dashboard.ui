"use strict";

var membersConfig = {
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{ 'label': translation.username[LANG], 'field': 'username' },
			{ 'label': translation.firstName[LANG], 'field': 'firstName' },
			{ 'label': translation.lastName[LANG], 'field': 'lastName' },
			{ 'label': translation.email[LANG], 'field': 'email' },
			{ 'label': translation.status[LANG], 'field': 'status' },
			{ 'label': translation.groups[LANG], 'field': 'grpsArr' }
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
	
	form: {
		'name': '',
		'label': '',
		'actions': {},
		'entries': [
			{
				'name': 'username',
				'label': translation.username[LANG],
				'type': 'text',
				'placeholder': translation.enterUsername[LANG],
				'value': '',
				'tooltip': translation.usernamesToolTip[LANG],
				'required': true
			},
			{
				'name': 'email',
				'label': translation.email[LANG],
				'type': 'email',
				'placeholder': translation.enterEmail[LANG],
				'value': '',
				'tooltip': translation.emailToolTip[LANG],
				'required': true
			},
			{
				'name': 'firstName',
				'label': translation.firstName[LANG],
				'type': 'text',
				'placeholder': translation.enterFirstName[LANG],
				'value': '',
				'tooltip': translation.enterFirstNameUser[LANG],
				'required': true
			},
			{
				'name': 'lastName',
				'label': translation.lastName[LANG],
				'type': 'text',
				'placeholder': translation.enterLastName[LANG],
				'value': '',
				'tooltip': translation.enterLastNameUser[LANG],
				'required': true
			}
		]
	},
	
	permissions: {
		"tenant": {
			'listConsoleTenants': ['dashboard', 'console/tenant/list', 'get'],
			'listTenant': ['dashboard', 'tenant/list', 'get'],
		},
		"adminAll": ['urac', '/admin/all', 'get'],
		'adminUser': {
			'list': ['urac', '/admin/users', 'get'],
			'changeStatusAccess': ['urac', '/admin/user/status', 'get'],
			'editUser': ['urac', '/admin/user', 'put'],
			'addUser': ['urac', '/admin/user', 'post'],
			'inviteUser':  ['urac', '/admin/users/invite', 'put'],
			'unInviteUser':  ['urac', '/admin/users/uninvite', 'put'],
			'editPinCode':  ['urac', '/admin/user/pin', 'put'],
			'editUserGroup':  ['urac', 'admin/user/groups', 'put'],
			'delete':  ['urac', 'admin/user', 'delete'],
		},
		'adminGroup': {
			'list': ['urac', '/admin/groups', 'get'],
			'add': ['urac', '/admin/group', 'post'],
			'edit': ['urac', '/admin/group', 'put'],
			'delete': ['urac', '/admin/group', 'delete'],
			'addUsers': ['urac', '/admin/group', 'post']
		}
	}
};

var groupsConfig = {
	consoleTenant : "DBTN",
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{ 'label': translation.code[LANG], 'field': 'code' },
			{ 'label': translation.name[LANG], 'field': 'name' },
			{ 'label': translation.description[LANG], 'field': 'description'}
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
	
	form: {
		'name': '',
		'label': '',
		'actions': {},
		'entries': [
			{
				'name': 'code',
				'label': translation.code[LANG],
				'type': 'text',
				'placeholder': translation.formGroupCodePlaceholder[LANG],
				'value': '',
				'tooltip': translation.formGroupCodeTooltip[LANG],
				'required': true
			},
			{
				'name': 'name',
				'label': translation.name[LANG],
				'type': 'text',
				'placeholder': translation.formGroupNamePlaceHolder[LANG],
				'value': '',
				'tooltip': '',
				'required': true
			},
			{
				'name': 'description',
				'label': translation.description[LANG],
				'type': 'textarea',
				'rows': 2,
				'placeholder': translation.formGroupDescriptionPlaceholder[LANG],
				'value': '',
				'tooltip': '',
				'required': true
			},
			{
				'name': 'package',
				'label': translation.package[LANG],
				'type': 'select',
				'value': [],
				'required': false,
				'tooltip': 'Specify which package to use',
				'fieldMsg': 'Specify which package to use'
			}
		]
	},
	users: {
		'name': '',
		'label': '',
		'msgs': {},
		'actions': {},
		'entries': [
			{
				'name': 'users',
				'label': translation.users[LANG],
				'type': 'checkbox',
				'placeholder': '',
				'value': [],
				'tooltip': translation.formGroupUsersTooltip[LANG],
				'required': true
			}
		]
	}
};