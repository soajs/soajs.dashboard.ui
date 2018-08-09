'use strict';

let infraLoadBalancerConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeLoadBalancer: ['dashboard', '/infra/extras', 'delete'],
		addLoadBalancer: ['dashboard', '/infra/extras', 'post'],
		editLoadBalancer: ['dashboard', '/infra/extras', 'put']
	}
};
