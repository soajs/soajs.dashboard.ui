'use strict';

var secretsAppConfig = {
	form: {
		add: {},

	},

	permissions: {
		list: ['dashboard', '/secrets/', 'get'],
		get: ['dashboard', '/secrets/secret', 'get'],
		add: ['dashboard', '/secrets/secret', 'post'],
		delete: ['dashboard', '/secrets/secret', 'delete'],
	}

};
