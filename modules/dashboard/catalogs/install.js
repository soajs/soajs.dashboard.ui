'use strict';

var catalogNav = [
    {
        'id': 'catalog-recipes',
        'label': "Recipes Catalog",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/recipe',
            'method': 'get'
        },
        'url': '#/catalog-recipes',
        'tplPath': 'modules/dashboard/catalogs/directives/list.tmpl',
        'icon': 'file-text2',
        'pillar': {
            'name': 'catalogs',
            'label': translation.catalogs[LANG],
            'position': 5
        },
        'mainMenu': true,
        'tracker': true,
        'order': 5,
        'scripts': ['modules/dashboard/catalogs/config.js', 'modules/dashboard/catalogs/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];

navigation = navigation.concat(catalogNav);