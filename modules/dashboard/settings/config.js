'use strict';

var settingAppConfig = {
	permissions: {
		getCurrentRelease: ['console', '/release', 'get'],
		searchLedger: ['console', '/ledger', 'get'],
		listTokens: ['infra', '/cd/tokens', 'get'],
		getToken: ['infra', '/cd/token', 'get'],
		changeTokenStatus: ['infra', '/cd/token/status', 'put'],
		addToken: ['infra', '/cd/token', 'post'],
		deleteToken: ['infra', '/cd/token', 'delete']
	}
	
};
