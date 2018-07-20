'use strict';

let infraGroupConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeGroup: ['dashboard', '/infra/extra', 'delete'],
		addGroup: ['dashboard', '/infra/extra', 'post'],
		editGroup: ['dashboard', '/infra/extra', 'put']
	}
};
