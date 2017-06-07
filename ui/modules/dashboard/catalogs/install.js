'use strict';

var catalogNav = [
    {
        'id': 'catalog-recipes',
        'label': "Catalog Recipes",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/catalog/recipes/list',
            'method': 'get'
        },
        'url': '#/catalog-recipes',
        'tplPath': 'modules/dashboard/catalogs/directives/list.tmpl',
        'icon': 'file-text2',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 3
        },
        'mainMenu': true,
        'tracker': true,
        'order': 5,
        'scripts': ['modules/dashboard/catalogs/config.js', 'modules/dashboard/catalogs/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(catalogNav);
