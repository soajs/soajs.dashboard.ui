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
								'label': 'Data',
								'type': 'jsoneditor',
								'required': true
							}
						]
						
					},
					{
						"label": "File Content",
						"description": "",
						"entries":[
							{
								'name': 'secretData',
								'label': 'Data',
								'type': 'jsoneditor',
								'required': true
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
