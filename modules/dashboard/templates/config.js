'use strict';

var templatesAppConfig = {
	documentationLink: "https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/400326661/Templates",
	
	permissions: {
		list: ['dashboard', '/templates', 'get'],
		delete: ['dashboard', '/templates', 'delete'],
		upgrade: ['dashboard', '/templates/upgrade', 'get'],
		import: ['dashboard', '/templates/import', 'post'],
		export: ['dashboard', '/templates/export', 'post']
	}

};
