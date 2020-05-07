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
	"addItem": {
		"ENG": "Add Item",
		"FRA": "Add Item"
	},
};

for (var attrname in sCTranslation) {
	translation[attrname] = sCTranslation[attrname];
}

var soajsCatalog = [
	{
		'id': 'soajsCatalog',
		'label': translation.soajsCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/soajs/items',
			'method': 'get'
		},
		'url': '#/soajsCatalog',
		'tplPath': 'modules/dashboard/marketplace/directives/soajs/list.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'catalogs',
			'label': translation.catalogs[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'order': 1,
		'scripts': ['modules/dashboard/marketplace/config.js', 'modules/dashboard/marketplace/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'staticCatalog',
		'label': translation.staticCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/staticCatalog',
		'tplPath': 'modules/dashboard/marketplace/directives/static/list.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'catalogs',
			'label': translation.catalogs[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'order': 2,
		'scripts': ['modules/dashboard/marketplace/config.js', 'modules/dashboard/marketplace/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'configCatalog',
		'label': translation.configCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/configCatalog',
		'tplPath': 'modules/dashboard/marketplace/directives/config/list.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'catalogs',
			'label': translation.catalogs[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'order': 3,
		'scripts': ['modules/dashboard/marketplace/config.js', 'modules/dashboard/marketplace/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'customCatalog',
		'label': translation.customCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/customCatalog',
		'tplPath': 'modules/dashboard/marketplace/directives/custom/list.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'catalogs',
			'label': translation.catalogs[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'order': 4,
		'scripts': ['modules/dashboard/marketplace/config.js', 'modules/dashboard/marketplace/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'resourceCatalog',
		'label': translation.resourceCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/items',
			'method': 'get'
		},
		'url': '#/resourceCatalog',
		'tplPath': 'modules/dashboard/marketplace/directives/resource/list.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'catalogs',
			'label': translation.catalogs[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'order': 5,
		'scripts': ['modules/dashboard/marketplace/config.js', 'modules/dashboard/marketplace/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'addResource',
		'label': translation.resourceCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/item/resource',
			'method': 'put'
		},
		'url': '#/catalog/resource/add',
		'tplPath': 'modules/dashboard/marketplace/directives/resource/add.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'catalogs',
			'label': translation.catalogs[LANG],
			'position': 1
		},
		'tracker': true,
		'order': 5,
		'scripts': ['modules/dashboard/marketplace/config.js', 'modules/dashboard/marketplace/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'editResource',
		'label': translation.resourceCatalog[LANG],
		'checkPermission': {
			'service': 'marketplace',
			'route': '/item/resource',
			'method': 'put'
		},
		'url': '#/catalog/resource/edit/:name/:version',
		'tplPath': 'modules/dashboard/marketplace/directives/resource/edit.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'catalogs',
			'label': translation.catalogs[LANG],
			'position': 1
		},
		'tracker': true,
		'order': 5,
		'scripts': ['modules/dashboard/marketplace/config.js', 'modules/dashboard/marketplace/controller.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(soajsCatalog);
