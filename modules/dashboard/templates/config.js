'use strict';

var templatesAppConfig = {
	documentationLink: "https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/400326661/Templates",
	form: {
		import:{
			step1: [
				{
					type: 'document',
					limit: 1,
					name: 'myTemplate',
					'label': "Provide your template file",
					"fieldMsg": "Import a template by supplying a zip file, the importer will parse your upload and inform you about any issues it detects.<br/>" +
					"If no issues are detected, the content of your template will be imported in the database."
				}
			]
		}
	},
	permissions: {
		list: ['dashboard', '/templates', 'get'],
		delete: ['dashboard', '/template', 'delete'],
		upgrade: ['dashboard', '/template/upgrade', 'get'],
		import: ['dashboard', '/templates/import', 'post'],
		export: ['dashboard', '/templates/export', 'post']
	}

};
