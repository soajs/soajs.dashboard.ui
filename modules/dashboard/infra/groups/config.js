'use strict';

let infraGroupConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeGroup: ['dashboard', '/infra/extras', 'delete'],
		addGroup: ['dashboard', '/infra/extras', 'post'],
		editGroup: ['dashboard', '/infra/extras', 'put']
	}
};
