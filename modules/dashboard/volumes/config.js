'use strict';

var volumesAppConfig = {
	form: {
		addVolume: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'required': true,
				'pattern': '^[A-Za-z0-9]+$'
			},
			{
				'name': 'storage',
				'label': 'Storage',
				'fieldMsg': "Size is in GB (GigaBytes)",
				'value': '1',
				'type': 'number',
				'required': true
			},
			{
				'name': 'accessModes',
				'label': 'Access Modes',
				'type': 'checkbox',
				'required': true,
				'value': [
					{l: 'ReadWriteOnce', v: 'ReadWriteOnce', selected: true},
					{l: 'ReadOnlyMany', v: 'ReadOnlyMany'},
					{l: 'ReadWriteMany', v: 'ReadWriteMany'}
				],
				'tooltip': 'Choose access mode',
				'fieldMsg':
					`<div>ReadWriteOnce – the volume can be mounted as readwrite by a single node.<br>
					ReadOnlyMany – the volume can be mounted readonly by many nodes.<br>
					ReadWriteMany – the volume can be mounted as readwrite by many nodes.</div>`
			}
		]
	},
	
	volumesGrid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{'label': 'Volume Name', 'field': 'name'},
			{'label': 'Volume ID', 'field': 'uid'},
			{'label': 'Namespace', 'field': 'namespace'},
			{'label': 'Access Modes', 'field': 'accessModes'},
			{'label': 'Volume storage', 'field': 'storage'}
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
	
	permissions: {
		list: ['dashboard', '/volume/claims', 'get'],
		get: ['dashboard', '/volume/claim', 'get'],
		add: ['dashboard', '/volume/claim', 'post'],
		delete: ['dashboard', '/volume/claim', 'delete'],
	}
	
};
