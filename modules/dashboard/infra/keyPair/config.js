'use strict';

let infraKeyPairConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeKeyPair: ['dashboard', '/infra/extras', 'delete'],
		addKeyPair: ['dashboard', '/infra/extras', 'post'],
		editKeyPair: ['dashboard', '/infra/extras', 'put']
	}
};
