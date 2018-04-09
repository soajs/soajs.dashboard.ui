'use strict';

var templatesAppConfig = {
	form: {
		import:{
			step1: [
				{
					type: 'document',
					limit: 1,
					name: 'myTemplate',
					'label': "Provide your template file",
					"fieldMsg": "Import template by supplying a zip file, the importer will parse your upload and inform you\n" +
					"\t\t\t\t\t\t\tabout any issue(s) it detects.<br/>\n" +
					"\t\t\t\t\t\t\tIf no issues are detected, the content of your template will be imported in the database."
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
