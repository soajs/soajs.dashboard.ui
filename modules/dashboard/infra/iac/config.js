'use strict';

let infraIACConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeTemplates: ['dashboard', '/infra/template', 'delete'],
		addTEmplate: ['dashboard', '/infra/template', 'post'],
	},

	form: {
		templates: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'value': "",
				'placeholder': 'My Template',
				'fieldMsg': 'Enter a name for your template',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'textarea',
				'value': "",
				'placeholder': 'My Template Description',
				'fieldMsg': 'Provide  a description for your template',
				'required': false
			},
			{
				'name': 'driver',
				'label': 'Driver',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select which supported infra cloud driver this template is compatible with.',
				'required': true
			},
			{
				'name': 'location',
				'label': 'Location',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select where to store this template.',
				'required': true
			},
			{
				'name': 'technology',
				'label': 'Technology',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select which supported technology this template is compatible with.',
				'required': true
			}
		]
	}
};
