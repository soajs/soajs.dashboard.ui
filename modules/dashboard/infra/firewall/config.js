'use strict';

let infraFirewallConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeFirewall: ['dashboard', '/infra/extras', 'delete'],
		addFirewall: ['dashboard', '/infra/extras', 'post'],
		editFirewall: ['dashboard', '/infra/extras', 'put']
	}
};
