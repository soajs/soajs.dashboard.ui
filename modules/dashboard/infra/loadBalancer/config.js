'use strict';

let infraLoadBalancerConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeLoadBalancer: ['dashboard', '/infra/extra', 'delete'],
		addLoadBalancer: ['dashboard', '/infra/extra', 'post'],
		editLoadBalancer: ['dashboard', '/infra/extra', 'put']
	}
};
