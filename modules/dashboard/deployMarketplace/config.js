var soajsDeployCatalogConfig = {
	permissions: {
		'items': {
			"list": ['marketplace', '/soajs/items', 'get']
		},
		'environments': {
			'list': ['console', '/environment', 'get']
		},
		'infra': {
			"kubernetes": {
				"item": {
					'get': ['infra', '/kubernetes/item/inspect', 'get'],
				},
				"secret": {
					"list": ['infra', "/kubernetes/configurations/Secret", "get"],
				},
				"pod": {
					"singleExec": ['infra', "/kubernetes/pod/exec", "put"],
					"multipleExec": ['infra', "/kubernetes/pods/exec", "put"],
					"logs": ['infra', "/kubernetes/pod/log", "get"],
					"metrics": ['infra', "/kubernetes/pods/metrics", "get"],
				}
			},
			"manual" :{
				"maintenance": ['marketplace', "/manual/awareness", "get"]
			}
		},
		"marketplace": {
			"configure": ['marketplace', "/item/deploy/configure", "put"],
			"build": ['marketplace', "/item/deploy/build", "put"],
			"redeploy": ['marketplace', "/item/deploy/redeploy", "put"],
			"deploy": ['marketplace', "/item/deploy", "put"],
			"maintenance": ['marketplace', "/item/maintenance", "put"],
		}
	},
	form: {
		serviceInfo: {
			'entries': [
				{
					'name': 'jsonData',
					'label': '',
					'type': 'jsoneditor',
					'options': {
						'mode': 'view',
						'availableModes': []
					},
					'height': '500px',
					"value": {}
				}
			]
		},
		multiServiceInfo: {
			'entries': [
				{
					'name': 'infoTabs',
					'label': '',
					'type': 'tabset',
					'tabs': []
				}
			]
		},
		addExecCommand: [{
			'name': 'execCommands',
			'label': 'Commands',
			'type': 'textarea',
			'required': true
		},
			{
				'name': 'response',
				'label': 'Response',
				'type': 'textarea',
				'required': false
			}],
		addExecCommands: [{
			'name': 'execCommands',
			'label': 'Commands',
			'type': 'textarea',
			'required': true
		},
			{
				'name': 'infoTabs',
				'label': 'Response',
				'type': 'tabset',
				'tabs': []
			}]
	},
};
