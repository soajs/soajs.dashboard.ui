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
				'value': [{'v': 'IPv4', 'l': 'IPv4'}, {'v': 'IPv6', 'l': 'IPv6'}],
				'fieldMsg': 'The IP Address Version',
				'required': true
			},
			{
				'name': 'publicIPAllocationMethod',
				'label': 'Public IP Allocation Method',
				'type': 'uiselect',
				'value': [{'v': 'dynamic', 'l': 'Dynamic'}, {'v': 'static', 'l': 'Static'}],
				'fieldMsg': 'The IP Address allocation method',
				'required': true
			},
			{
				'name': 'idleTimeout',
				'label': 'Idle Timeout',
				'type': 'number',
				'value': "",
				'min': 240,
				'max':1800,
				'fieldMsg': 'The Idle Timeout between 240s and 1800s (in the case of Azure, this value will be converted to minutes)',
				'required': true
			},
			{
				'name': 'type',
				'label': 'Type',
				'type': 'uiselect',
				'value': [{'v': 'basic', 'l': 'Basic'}, {'v': 'standard', 'l': 'Standard'}],
				'fieldMsg': 'The IP Address Type',
				'required': true
			},
			// {
			// 	'type': 'group',
			// 	'label': 'Labels',
			// 	'entries': [
			// 		{
			// 			'type': 'html',
			// 			'name': 'addLabel',
			// 			'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Label'/>"
			// 		}
			// 	]
			// }
		],

		editIP: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'readonly',
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
				'type': 'readonly',
				'value': "",
				'fieldMsg': 'The IP Address Version',
				'required': true
			},
			{
				'name': 'type',
				'label': 'Type',
				'type': 'readonly',
				'value': "",
				'fieldMsg': 'The IP Address Type',
				'required': true
			},
			{
				'name': 'publicIPAllocationMethod',
				'label': 'Public IP Allocation Method',
				'type': 'uiselect',
				'value': [{'v': 'dynamic', 'l': 'Dynamic'}, {'v': 'static', 'l': 'Static'}],
				'fieldMsg': 'The IP Address allocation method',
				'required': true
			},
			{
				'name': 'idleTimeout',
				'label': 'Idle Timeout',
				'type': 'number',
				'value': "",
				'min': 240,
				'max':1800,
				'fieldMsg': 'The Idle Timeout between 240s and 1800s (in the case of Azure, this value will be converted to minutes)',
				'required': true
			},
			// {
			// 	'type': 'group',
			// 	'label': 'Labels',
			// 	'entries': [
			// 		{
			// 			'type': 'html',
			// 			'name': 'addLabel',
			// 			'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Label'/>"
			// 		}
			// 	]
			// }
		],

		labelInput : {
			'name': 'labelGroup',
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
