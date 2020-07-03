'use strict';

var settingAppConfig = {
	permissions: {
		list: ['dashboard', '/catalog/recipes/list', 'get'],
		add: ['dashboard', '/catalog/recipes/add', 'post'],
		update: ['dashboard', '/catalog/recipes/update', 'put'],
		delete: ['dashboard', '/catalog/recipes/delete', 'delete'],
		upgrade: ['dashboard', '/catalog/recipes/upgrade', 'get'],
		import: ['dashboard', '/templates/import', 'post'],
		export: ['dashboard', '/templates/export', 'post'],
		listTokens: ['infra', '/cd/tokens', 'get'],
		getToken: ['infra', '/cd/token', 'get'],
		changeTokenStatus: ['infra', '/cd/token/status', 'put'],
		addToken: ['infra', '/cd/token', 'post'],
		deleteToken: ['infra', '/cd/token', 'delete']
	}
	
};
