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
				'placeholder': 'Network Name',
				'fieldMsg': 'Enter a name for the network',
				'required': true
			},
			{
				'name': 'region',
				'label': 'Region',
				'type': 'readonly',
				'value': "",
				'fieldMsg': 'Region where the network will be located',
				'required': true
			},
			{
				'name': 'address',
				'label': 'Addresses',
				'type': 'text',
				'value': "",
				"placeholder": "10.0.0.1/16",
				'fieldMsg': 'Enter an address for the network',
				'required': false
			},
			{
				'name': 'dnsServers',
				'label': 'DNS Servers',
				'type': 'text',
				'value': "",
				'fieldMsg': 'Enter DNS servers for this network separated by commas. Example: 0.0.0.0, 1.1.1.1',
				'required': false
			},
			{
				'name': 'subnets',
				'label': 'Subnets',
				'type': 'jsoneditor',
				'value': [],
				'fieldMsg': 'Enter an array of subnets for this network. Exmaple: { "name": "mySubnet", "address": "10.0.0.0/24" }',
				'required': false
			}
		],

		addressInput : {
			'name': 'AddressGroup',
			'type': 'group',
			'label': 'New Address',
			'entries': [
				{
					'name': 'address',
					'label': 'Address',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the IP Address',
					'fieldMsg': 'Enter the IP Address',
					'placeholder': "10.0.0.1/16"
				},
				{
					'type': 'html',
					'name': 'rAddress',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},

		dnsInput : {
			'name': 'DnsGroup',
			'type': 'group',
			'label': 'New DNS Server',
			'entries': [
				{
					'name': 'dnsServer',
					'label': 'DNS Server',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the DNS Server Address',
					'fieldMsg': 'Enter the DNS Server Address',
					'placeholder': "0.0.0.0"
				},
				{
					'type': 'html',
					'name': 'rDNS',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},

		dnsInput : {
			'name': 'SubnetGroup',
			'type': 'group',
			'label': 'New Subnet',
			'entries': [
				{
					'name': 'subnet',
					'label': 'Subnet',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the subnet range',
					'fieldMsg': 'Enter the subnet range',
					'placeholder': "/16"
				},
				{
					'type': 'html',
					'name': 'rSubnet',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},

		labelInput : {
			'name': 'LabelGroup',
			'type': 'group',
			'label': 'New Label',
			'entries': [
				{
					'name': 'labelName',
					'label': 'Label Name',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the name of the label',
					'fieldMsg': 'Enter the name of the label',
					'placeholder': "My label name"
				},
				{
					'name': 'labelValue',
					'label': 'Label Value',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the value of the label',
					'fieldMsg': 'Enter the value of the label',
					'placeholder': "My label Value"
				},
				{
					'type': 'html',
					'name': 'rLabel',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		}
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
