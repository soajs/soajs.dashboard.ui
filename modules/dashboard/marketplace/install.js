"use strict";
var sCTranslation = {
	"soajsCatalog": {
		"ENG": "SOAJS Catalog",
		"FRA": "SOAJS Catalog"
	}
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
			'route': '/soajs/item',
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
	}
];
navigation = navigation.concat(soajsCatalog);
