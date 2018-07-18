'use strict';

let infraIPConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeIP: ['dashboard', '/infra/extra', 'delete'],
		addIP: ['dashboard', '/infra/extra', 'post'],
		editIP: ['dashboard', '/infra/extra', 'put']
	},

	form: {
		addIP: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'value': "",
				'placeholder': ' My Public IP Name',
				'fieldMsg': 'Enter a name for the Public IP',
				'required': true
			},
			{
				'name': 'region',
				'label': 'Region',
				'type': 'readonly',
				'value': "",
				'fieldMsg': 'Region where the Public IP will be located',
				'required': true
			},
			{
				'name': 'ipAddressVersion',
				'label': 'IP Address Version',
				'type': 'uiselect',
				'value': [{'v': 'Dynamic', 'l': 'Dynamic'}, {'v': 'Static', 'l': 'Static'}],
				'fieldMsg': 'The IP Address Version',
				'required': true
			},
			{
				'name': 'publicIPAllocationMethod',
				'label': 'Public IP Allocation Method',
				'type': 'uiselect',
				'value': [{'v': 'IPv4', 'l': 'IPv4'}, {'v': 'IPv6', 'l': 'IPv6'}],
				'fieldMsg': 'The IP Address allocation method',
				'required': true
			},
			{
				'name': 'idleTimeoutInMinutes',
				'label': 'Idle Timeout',
				'type': 'integer',
				'value': "",
				'min': 4,
				'max':30,
				'fieldMsg': 'Idle Timeout (in minutes)',
				'required': true
			},
			{
				'name': 'type',
				'label': 'Type',
				'type': 'uiselect',
				'value': [{'v': 'Basic', 'l': 'Basic'}, {'v': 'Standard', 'l': 'Standard'}],
				'fieldMsg': 'The IP Address Type',
				'required': true
			},
			{
				'type': 'group',
				'label': 'Labels',
				'entries': [
					{
						'type': 'html',
						'name': 'addLabel',
						'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Label'/>"
					}
				]
			}
		],

		editIP: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'value': "",
				'placeholder': ' My Public IP Name',
				'fieldMsg': 'Enter a name for the Public IP',
				'required': true
			},
			{
				'name': 'region',
				'label': 'Region',
				'type': 'readonly',
				'value': "",
				'fieldMsg': 'Region where the Public IP will be located',
				'required': true
			},
			{
				'type': 'group',
				'label': 'Labels',
				'entries': [
					{
						'type': 'html',
						'name': 'addLabel',
						'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Label'/>"
					}
				]
			}
		]
	},

	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{ 'label': 'Name', 'field': 'name' },
			{ 'label': 'Address', 'field': 'address' },
			{ 'label': 'Allocation Method', 'field': 'publicIPAllocationMethod' },
			{ 'label': 'Idle Timeout (seconds)', 'field': 'idleTimeout' },
			{ 'label': 'IP Version', 'field': 'ipAddressVersion' },
			{ 'label': 'Associated To', 'field': 'associated' }
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
};
