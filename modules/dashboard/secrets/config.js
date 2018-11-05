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
						],
						"onAction": function (id, data, form) {
							form.formData.secretType = "Opaque";
						}
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
						],
						"onAction": function (id, data, form) {
							form.formData.secretType = "Opaque";
						}
					},
					{
						"label": "Registry Secret",
						"description": "",
						"entries":[
							{
								'type': 'text',
								'value': '',
								'name': 'registryServer',
								'label': 'Registry Server',
								'placeholder': 'https://index.docker.io/v1/',
								'tooltip': "Enter the Registry Server",
								'fieldMsg': "Enter the  Registry Server",
								'required': true
							},
							{
								'type': 'text',
								'value': '',
								'name': 'registryEmail',
								'label': 'registryEmail',
								'placeholder': 'email',
								'tooltip': "Enter your Registry Email",
								'fieldMsg': "Enter the  Registry Email",
								'required': true
							},
							{
								'type': 'text',
								'value': '',
								'name': 'registryUsername',
								'label': 'Registry Username',
								'placeholder': 'username',
								'tooltip': "Enter the Registry Username",
								'fieldMsg': "Enter the  Registry Username",
								'required': true
							},
							{
								'type': 'password',
								'value': '',
								'name': 'registryPassword',
								'label': 'Registry Password',
								'placeholder': 'password',
								'tooltip': "Enter the Registry Password",
								'fieldMsg': "Enter the  Registry Password",
								'required': true
							}
						],
						"onAction": function (id, data, form) {
							form.formData.secretType = "kubernetes.io/dockercfg";
						}
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
