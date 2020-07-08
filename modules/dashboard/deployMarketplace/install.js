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
			'modules/dashboard/deployMarketplace/soajsController.js',
			'modules/dashboard/deployMarketplace/services/soajsKubeServices.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'apiDeployCatalog',
		'label': translation.apiCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/deploy-apiCatalog',
		'tplPath': 'modules/dashboard/deployMarketplace/directives/api/list.tmpl',
		'icon': 'drive',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'order': 11,
		'scripts': ['modules/dashboard/deployMarketplace/config.js',
			'modules/dashboard/deployMarketplace/apiController.js',
			'modules/dashboard/deployMarketplace/services/apiKubeServices.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'staticDeployCatalog',
		'label': translation.staticCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/deploy-staticCatalog',
		'tplPath': 'modules/dashboard/deployMarketplace/directives/static/list.tmpl',
		'icon': 'insert-template',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'order': 12,
		'scripts': ['modules/dashboard/deployMarketplace/config.js',
			'modules/dashboard/deployMarketplace/staticController.js',
			'modules/dashboard/deployMarketplace/services/staticKubeServices.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'resourceDeployCatalog',
		'label': translation.resourceCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/deploy-resourceCatalog',
		'tplPath': 'modules/dashboard/deployMarketplace/directives/resource/list.tmpl',
		'icon': 'database',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'order': 13,
		'scripts': ['modules/dashboard/deployMarketplace/config.js',
			'modules/dashboard/deployMarketplace/resourceController.js',
			'modules/dashboard/deployMarketplace/services/resourceKubeServices.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'daemonDeployCatalog',
		'label': translation.daemonCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/deploy-daemonCatalog',
		'tplPath': 'modules/dashboard/deployMarketplace/directives/daemon/list.tmpl',
		'icon': 'evil2',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'order': 14,
		'scripts': ['modules/dashboard/deployMarketplace/config.js',
			'modules/dashboard/deployMarketplace/daemonController.js',
			'modules/dashboard/deployMarketplace/services/daemonKubeServices.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'customDeployCatalog',
		'label': translation.customCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/deploy-customCatalog',
		'tplPath': 'modules/dashboard/deployMarketplace/directives/custom/list.tmpl',
		'icon': 'evil2',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'order': 15,
		'scripts': ['modules/dashboard/deployMarketplace/config.js',
			'modules/dashboard/deployMarketplace/customController.js',
			'modules/dashboard/deployMarketplace/services/customKubeServices.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(soajsCatalog);
