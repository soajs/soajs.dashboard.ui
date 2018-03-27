'use strict';

var secretsAppConfig = {
	form: {
		addSecret: [
			{
				'name': 'secretName',
				'label': 'Name',
				'type': 'textarea',
				'required': true
			},
			{
				'name': 'secretData',
				'label': 'Data',
				'type': 'jsoneditor',
				'required': true
			}
		]
	},

	secretsGrid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{ 'label': 'Secret Name', 'field': 'name' },
			{ 'label': 'Secret ID', 'field': 'uid' },
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},

	permissions: {
		list: ['dashboard', '/secrets/list', 'get'],
		get: ['dashboard', '/secrets/get', 'get'],
		add: ['dashboard', '/secrets/add', 'post'],
		delete: ['dashboard', '/secrets/delete', 'delete'],
	}

};
