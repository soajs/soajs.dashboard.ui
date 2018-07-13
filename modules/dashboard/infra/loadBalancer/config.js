'use strict';

let infraLoadBalancerConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeLoadBalancer: ['dashboard', '/infra/extra', 'delete'],
		addLoadBalancer: ['dashboard', '/infra/extra', 'post'],
		editLoadBalancer: ['dashboard', '/infra/extra', 'put']
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
			{ 'label': 'Load Balancer Name', 'field': 'name' },
			{ 'label': 'Load Balancer Region', 'field': 'region' },
			{ 'label': 'Load Balancer Ports', 'field': 'ports' },
			{ 'label': 'Load Balancer Ports', 'field': 'ipAddresses' },
			{ 'label': 'Load Balancer Ports', 'field': 'ipConfigs' },
			{ 'label': 'Load Balancer Ports', 'field': 'natPools' },
			{ 'label': 'Load Balancer Ports', 'field': 'natRules' },
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
};
