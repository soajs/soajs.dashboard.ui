'use strict';

var secretsAppConfig = {
	form: {
		addSecret: [
			{
				'name': 'secretName',
				'label': 'Name',
				'type': 'text',
				'required': true
			},
			{
				"type":"tabset",
				"tabs": [
					{
						"label": "Text Content",
						"description": "",
						"entries":[
							{
								'name': 'textMode',
								'label': 'I am adding a text value',
								'fieldMsg': "Turn on this mode if the value you are about to enter is made up of text only (Default mode does not support text only)",
								'type': 'buttonSlider',
								'value': false,
								'required': true
							},
							{
								'name': 'secretData',
								'value': '',
								'label': 'Secret Content Data',
								'type': 'jsoneditor',
								'required': true,
								'fieldMsg': "Provide the content of the secret as text/json",
								'height': 100
							}
						]

					},
					{
						"label": "File Content",
						"description": "",
						"entries":[
							{
								"label": "File Upload",
								"fieldMsg": "Select a file to create the secret content from it",
								'name': 'secretFile',
								"directive": "modules/dashboard/secrets/directives/file.tmpl",
								"required": false
							}
						]

					}
				]
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
