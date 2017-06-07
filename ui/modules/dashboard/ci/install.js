'use strict';

var ciNav = [
    {
        'id': 'continuous-integration',
        'label': "Continuous Integration",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/ci',
            'method': 'get'
        },
        'url': '#/continuous-integration',
        'tplPath': 'modules/dashboard/ci/directives/list.tmpl',
        'icon': 'upload',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 6
        },
        'mainMenu': true,
        'tracker': true,
        'order': 1,
        'scripts': ['modules/dashboard/ci/config.js', 'modules/dashboard/ci/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(ciNav);
