'use strict';

let infraFirewallConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeFirewall: ['dashboard', '/infra/extra', 'delete'],
		addFirewall: ['dashboard', '/infra/extra', 'post'],
		editFirewall: ['dashboard', '/infra/extra', 'put']
	},
	
	form: {
		firewall: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'readonly',
				'value': "",
				'placeholder': ' My Firewall',
				'required': true
			},
			{
				'name': 'region',
				'label': 'Region',
				'type': 'readonly',
				'value': "",
				'required': true
			},
			{
				'type': 'accordion',
				'name': 'firewallPorts',
				'label': 'Ports',
				'entries': [
					{
						'type': 'html',
						'name': 'addPort',
						'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add New Port'/>"
					}
				]
			}
		],
		portInput: {
			'name': 'portGroup',
			'type': 'group',
			'label': 'New Port',
			'collapsed': true,
			'icon': 'plus',
			'entries': [
				{
					'name': 'name',
					'label': 'Port Name',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the name of the Port',
					'fieldMsg': 'Enter the name of the Port',
					'placeholder': "My Port"
				},
				{
					'name': 'protocol',
					'label': 'Protocol',
					'type': 'select',
					'value': [
						{'v': 'TCP', 'l': "TCP", 'selected': true},
						{'v': 'UDP', 'l': "UCP"},
						{'v': '*', 'l': "TCP/UCP"}
					],
					'required': true,
					'tooltip': 'Select Port Protocol',
					'fieldMsg': 'Select Port Protocol'
				},
				{
					'name': 'access',
					'label': 'Access',
					'type': 'select',
					'value': [
						{'v': 'allow', 'l': "Allow", 'selected': true},
						{'v': 'deny', 'l': "Deny"}
					],
					'required': true
				},
				{
					'name': 'direction',
					'label': 'Direction',
					'type': 'select',
					'value': [
						{'v': 'inbound', 'l': "Inbound", 'selected': true},
						{'v': 'outbound', 'l': "Outbound"}
					],
					'required': true
				},
				{
					'name': 'target',
					'label': 'Source Port',
					'type': 'text',
					'value': "0",
					'required': true,
					'placeholder': "0"
				},
				{
					'name': 'sourceAddress',
					'label': 'Source Address',
					'type': 'text',
					'value': '',
					'required': true,
					'fieldMsg': 'example: 0.0.0.0/0 OR * for Any'
				},
				{
					'name': 'destinationAddress',
					'label': 'Destination Address',
					'type': 'text',
					'value': '',
					'required': true,
					'fieldMsg': 'example: 0.0.0.0/0 OR * for Any'
				},
				{
					'name': 'published',
					'label': 'Destination Port',
					'type': 'text',
					'value': 0,
					'required': true,
					'placeholder': "0"
				},
				{
					'name': 'priority',
					'label': 'Priority',
					'type': 'number',
					'value': 0,
					'required': true,
					'tooltip': 'Enter the port priority',
					'fieldMsg': 'Enter the port priority',
					'placeholder': "0"
				}
			]
		}
	},
	
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{'label': 'Firewall Name', 'field': 'name'},
			{'label': 'Firewall Region', 'field': 'region'},
			{'label': 'Firewall Ports', 'field': 'ports'},
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
};
