'use strict';

let infraNetworkConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeNetwork: ['dashboard', '/infra/extra', 'delete'],
		addNetwork: ['dashboard', '/infra/extra', 'post'],
		editNetwork: ['dashboard', '/infra/extra', 'put']
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
			{ 'label': 'Network Name', 'field': 'name' },
			{ 'label': 'Network Address Prefixes', 'field': 'addressPrefixes' },
			{ 'label': 'Network DNS Servers', 'field': 'dnsServers' },
			{ 'label': 'Network Subnets', 'field': 'subnets' }
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
};
