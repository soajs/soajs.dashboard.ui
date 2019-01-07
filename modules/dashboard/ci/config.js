'use strict';
var ciAppConfig = {
	form: {
		f1: {
			travis: {
				entries: [
					{
						'name': 'domain',
						'label': 'Domain',
						'type': 'text',
						'value': '',
						'placeholder': "",
						'required': true,
						'fieldMsg': "Enter the domain value. Use api.travis-ci.com for public and private projects support. "
					},
					{
						'name': 'gitToken',
						'label': 'GIT Token',
						'type': 'text',
						'value': '',
						'required': true,
						'fieldMsg': "Enter the GIT Token Value"
					},
					{
						'type': 'html',
						'value': "<input type='button' value='Add Custom Environment Variable' class='btn btn-sm btn-success f-right'/>",
						'name': 'addCustomEnvVariables'
					}
				]
			},
			customEnv: [
				{
					'type': 'html',
					'name': 'hr',
					'value': '<hr>'
				},
				{
					'name': 'labelName',
					'label': 'Name',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the name of the Environment Variable',
					'fieldMsg': 'Enter the name of the Environment Variable',
					'placeholder': "name"
				},
				{
					'name': 'labelValue',
					'label': 'Value',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the value of the Environment Variable',
					'fieldMsg': 'Enter the value of the Environment Variable',
					'placeholder': "value"
				},
				{
					'type': 'html',
					'name': 'rLabel',
					'value': '<span class="icon icon-cross f-right"></span>'
				}
			],
			drone: {
				entries: [
					{
						'name': 'domain',
						'label': 'Domain',
						'type': 'text',
						'value': '',
						'placeholder': "",
						'required': true,
						'fieldMsg': "Enter the domain URL value. EX: http://mydoronedomain.com:8000"
					},
					{
						'name': 'gitToken',
						'label': 'Drone Token',
						'type': 'text',
						'value': '',
						'required': true,
						'fieldMsg': "Enter Your Drone Token (provided in your Drone account)"
					},
					{
						'name': 'version',
						'label': 'Backward Compatibility',
						'type': 'checkbox',
						'value': [{'v': true, 'l': 'Version 7 or Below'}],
						'required': true,
						'fieldMsg': "Check the box if Drone Version 7 or below"
					}
				]
			}
		},
		f2: {
			entries: [
				{
					'name': 'template',
					'label': 'Existing Recipe Template',
					'type': 'select',
					'value': [],
					'required': true
				},
				{
					'name': 'name',
					'label': 'Recipe Name',
					'type': 'text',
					'value': '',
					'placeholder': "My Custom Recipe",
					'required': true,
					'fieldMsg': "Enter the name of the recipe"
				},
				{
					'name': 'recipe',
					'label': 'Recipe Content',
					'type': 'textarea',
					'value': '',
					'required': true,
					'rows': 20,
					'cols': 100,
					'fieldMsg': "Provide the Continuous Integration Recipe as YAML code. Once you submit, the dashboard will ensure that the continuous delivery integration script is included in your recipe and that it should run only if the build passes in case you did not provide it."
				}
			]
		}
	},
	permissions: {
		get: ['dashboard', '/ci', 'get'],
		deactivate: ['dashboard', '/ci/provider', 'put'],
		activate: ['dashboard', '/ci/provider', 'post'],
		
		providers: ['dashboard', '/ci/providers', 'get'],
		add: ['dashboard', '/ci/recipe', 'post'],
		edit: ['dashboard', '/ci/recipe', 'put'],
		delete: ['dashboard', '/ci/recipe', 'delete'],
		
		import: ['dashboard', '/templates/import', 'post'],
		export: ['dashboard', '/templates/export', 'post']
	}

};
