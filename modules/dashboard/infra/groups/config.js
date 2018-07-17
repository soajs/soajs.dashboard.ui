'use strict';

let infraGroupConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeGroup: ['dashboard', '/infra/extra', 'delete'],
		addGroup: ['dashboard', '/infra/extra', 'post'],
		editGroup: ['dashboard', '/infra/extra', 'put']
	},

	form: {
		addGroup: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'value': "",
				'placeholder': ' My Resource Group',
				'fieldMsg': 'Enter a name for the resource group',
				'required': true
			},
			{
				'name': 'region',
				'label': 'Region',
				'type': 'readonly',
				'value': "",
				'fieldMsg': 'Region where the resource group will be located',
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

		editGroup: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'readonly',
				'value': "",
				'placeholder': ' My Resource Group',
				'fieldMsg': 'Enter a name for the resource group',
				'required': true
			},
			{
				'name': 'region',
				'label': 'Region',
				'type': 'readonly',
				'value': "",
				'fieldMsg': 'Region where the resource group will be located',
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
			{ 'label': 'Resource Group Name', 'field': 'name' },
			{'label': '', 'field': 'networks' },
			{'label': '', 'field': 'firewalls' },
			{'label': '', 'field': 'ips' },
			{'label': '', 'field': 'lbs' },
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
};
