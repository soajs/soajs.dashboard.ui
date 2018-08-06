'use strict';

let infraNetworkConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeNetwork: ['dashboard', '/infra/extras', 'delete'],
		addNetwork: ['dashboard', '/infra/extras', 'post'],
		editNetwork: ['dashboard', '/infra/extras', 'put']
	}
};
