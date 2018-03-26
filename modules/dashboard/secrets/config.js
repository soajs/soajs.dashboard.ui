'use strict';

var secretsAppConfig = {
	form: {
		addDockerSecret: [
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
		],
		addKubernetesSecret: [
			{
				'name': 'secretName',
				'label': 'Name',
				'type': 'textarea',
				'required': true
			},
			{
				'name': 'secretType',
				'label': 'Type',
				'type': 'textarea',
				'required': true
			},
			{
				'name': 'namespace',
				'label': 'Namespace',
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

	dockerSecretsGrid: {
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
	kubernetesSecretsGrid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{ 'label': 'Secret Name', 'field': 'name' },
			{ 'label': 'Secret ID', 'field': 'uid' },
			{ 'label': 'Secret Type', 'field': 'type' },
			{ 'label': 'Namespace', 'field': 'namespace' },
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
