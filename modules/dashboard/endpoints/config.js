var servicesConfig = {
	form: {
		
	},
	permissions: {
		'listEndpoints': ['dashboard', '/apiBuilder/list', 'get'],
		'addEditEndpoint': ['dashboard', '/apiBuilder/add', 'post'],
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
	}
};
