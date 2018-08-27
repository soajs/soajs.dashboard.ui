'use strict';

var importAppConfig = {
	storeLink: "https://www.herrontech.com/store",
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
		import: ['dashboard', '/templates/import', 'post'],
		export: ['dashboard', '/templates/export', 'post']
	}

};
