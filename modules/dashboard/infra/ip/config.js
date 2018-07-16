'use strict';

let infraIPConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeIP: ['dashboard', '/infra/extra', 'delete'],
		addIP: ['dashboard', '/infra/extra', 'post'],
		editIP: ['dashboard', '/infra/extra', 'put']
	},

	form: {
		network: [
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
				'name': 'location',
				'label': 'Location',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select where to store this template.',
				'required': true
			}
		]
	},

	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{ 'label': 'Name', 'field': 'name' },
			{ 'label': 'Address', 'field': 'address' },
			{ 'label': 'Allocation Method', 'field': 'allocationMethod' },
			{ 'label': 'Idle Timeout', 'field': 'idleTimeout' },
			{ 'label': 'IP Version', 'field': 'version' },
			{ 'label': 'Associated To', 'field': 'associated' }
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
};
