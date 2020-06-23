"use strict";
var sCTranslation = {
	"soajsCatalog": {
		"ENG": "SOAJS Catalog",
		"FRA": "SOAJS Catalog"
	},
	"staticCatalog": {
		"ENG": "Frontend Catalog",
		"FRA": "Frontend Catalog"
	},
	"configCatalog": {
		"ENG": "Config Catalog",
		"FRA": "Config Catalog"
	},
	"customCatalog": {
		"ENG": "Custom Catalog",
		"FRA": "Custom Catalog"
	},
	"resourceCatalog": {
		"ENG": "Resource Catalog",
		"FRA": "Resource Catalog"
	},
	"apiCatalog": {
		"ENG": "Api Catalog",
		"FRA": "Api Catalog"
	},
	"daemonCatalog": {
		"ENG": "Daemon Catalog",
		"FRA": "Daemon Catalog"
	},
	"addItem": {
		"ENG": "Add Item",
		"FRA": "Add Item"
	},
	"repository": {
		"ENG": "Repository",
		"FRA": "Repository"
	},
};

for (var attrname in sCTranslation) {
	translation[attrname] = sCTranslation[attrname];
}

var soajsCatalog = [
	{
		'id': 'soajsDeployCatalog',
		'label': translation.soajsCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/soajs/items',
			'method': 'get'
		},
		'url': '#/deploy-soajsCatalog',
		'tplPath': 'modules/dashboard/deployMarketplace/directives/soajs/list.tmpl',
		'icon': 'drive',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'order': 10,
		'scripts': ['modules/dashboard/deployMarketplace/config.js',
			'modules/dashboard/deployMarketplace/controller.js',
			'modules/dashboard/deployMarketplace/services/kubeServices.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(soajsCatalog);
