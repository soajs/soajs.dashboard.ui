'use strict';

let infraFirewallConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeFirewall: ['dashboard', '/infra/extra', 'delete'],
		addFirewall: ['dashboard', '/infra/extra', 'post'],
		editFirewall: ['dashboard', '/infra/extra', 'put']
	}
};
