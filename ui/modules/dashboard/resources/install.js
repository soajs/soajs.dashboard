'use strict';

var resourcesNav = [
    {
        'id': 'resources',
        'label': "Resources",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/resources/list',
            'method': 'get'
        },
        'url': '#/resources',
        'tplPath': 'modules/dashboard/resources/directives/list.tmpl',
        'icon': 'stack',
        'pillar': {
            'name': 'deployment',
            'label': translation.deploy[LANG],
            'position': 3
        },
        'mainMenu': true,
        'tracker': true,
        'order': 5,
        'scripts': ['modules/dashboard/resources/config.js', 'modules/dashboard/resources/controller.js', 'modules/dashboard/resources/services/configuration.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(resourcesNav);
