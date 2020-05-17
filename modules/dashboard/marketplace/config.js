var soajsCatalogConfig = {
	permissions: {
		'listServices': ['marketplace', '/soajs/items', 'get'],
		'getEnv': ['dashboard', '/services/env/list', 'get'],
		'tenants': {
			'list': ['dashboard', '/tenant/list', 'get']
		},
		'environments': {
			'list': ['dashboard', '/environment/list', 'get']
		}
	}
};
