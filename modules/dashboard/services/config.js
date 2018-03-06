var servicesConfig = {
	form: {
		"oneApi": [
			{
				'name': 'apiV%count%',
				'label': translation.aPIRoute[LANG],
				'type': 'text',
				'value': '',
				'placeholder': '/' + translation.routeName[LANG]
			},
			{
				'name': 'apiL%count%',
				'label': translation.aPILabel[LANG],
				'type': 'text',
				'value': '',
				'placeholder': translation.myAPIRoute[LANG]
			},
			{
				'name': 'apiG%count%',
				'label': translation.aPIGroup[LANG],
				'type': 'text',
				'value': '',
				'placeholder': translation.myAPIGroup[LANG]
			},
			{
				'name': 'apiMain%count%',
				'label': translation.defaultGroupAPI[LANG],
				'type': 'readonly',
				'value': ''
			}
		],
		"jobServiceConfig": {
			"entries": [
				{
					"name": "env",
					"label": translation.environment[LANG],
					"type": "text",
					"value": "",
					"tooltip": translation.envCode[LANG],
					"required": true
				},
				{
				    'name': 'config',
				    'label': translation.serviceConfiguration[LANG],
				    'type': 'jsoneditor',
				    'options': {
				        'mode': 'code',
				        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
				    },
				    'height': '200px',
				    "value": {},
				    'required': true,
					"tooltip": translation.serviceConfiguration[LANG]
				}
			]
		}
	},
	permissions: {
		'listServices': ['dashboard', '/services/list', 'post'],
		'updateServiceSettings': ['dashboard', '/services/settings/update', 'put'],

		'getEnv': ['dashboard', '/services/env/list', 'get'],

		'daemons': {
			'list': ['dashboard', '/daemons/list', 'post']
		},
		'daemonGroupConfig': {
			'list': ['dashboard', '/daemons/groupConfig/list', 'post'],
			'update': ['dashboard', '/daemons/groupConfig/update', 'put'],
			'delete': ['dashboard', '/daemons/groupConfig/delete', 'delete'],
			'add': ['dashboard', '/daemons/groupConfig/add', 'post']
		},
		'tenants': {
			'list': ['dashboard', '/tenant/list', 'get']
		},
		'environments': {
			'list': ['dashboard', '/environment/list', 'get']
		}
	},
	
	protocolConflict:{
		"chrome": {
			"label": "Google Chrome",
			"link": "https://superuser.com/questions/487748/how-to-allow-chrome-browser-to-load-insecure-content"
		},
		"firefox": {
			"label": "Firefox",
			"link": "https://support.mozilla.org/en-US/kb/mixed-content-blocking-firefox#w_unblock-mixed-content"
		},
		"safari": {
			"label": "Safari",
			"link": ""
		},
		"internet explorer": {
			"label": "Internet Explorer",
			"link": "https://support.microsoft.com/sw-ke/help/2625928/only-secure-content-is-displayed-notification-in-internet-explorer-9-o"
		}
	}
};
