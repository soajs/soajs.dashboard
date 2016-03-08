"use strict";

var staticContentNav = [
    {
        'id': 'static-content',
        'label': 'Static Content',
        'checkPermission': {
            'service': 'dashboard',
            'route': '/staticContent/list'
        },
        'url': '#/static-content',
        'tplPath': 'modules/DASHBOARD/staticContent/directives/list.tmpl',
        'icon': 'files-empty',
        'pillar': {
            'name': 'development',
            'label': 'Develop',
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 3,
        'scripts': ['modules/DASHBOARD/staticContent/config.js', 'modules/DASHBOARD/staticContent/controller.js'],
        'ancestor': translation.home[LANG]
    }
];
navigation = navigation.concat(staticContentNav);