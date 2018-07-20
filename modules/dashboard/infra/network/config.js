'use strict';

let infraNetworkConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeNetwork: ['dashboard', '/infra/extra', 'delete'],
		addNetwork: ['dashboard', '/infra/extra', 'post'],
		editNetwork: ['dashboard', '/infra/extra', 'put']
	}
};
