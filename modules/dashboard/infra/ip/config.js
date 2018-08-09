'use strict';

let infraIPConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeIP: ['dashboard', '/infra/extras', 'delete'],
		addIP: ['dashboard', '/infra/extras', 'post'],
		editIP: ['dashboard', '/infra/extras', 'put']
	}
};
