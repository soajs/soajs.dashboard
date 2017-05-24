'use strict';

var cdNav = [
    {
        'id': 'continuous-delivery',
        'label': "Continuous Delivery",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/cd',
            'method': 'get'
        },
        'url': '#/continuous-delivery',
        'tplPath': 'modules/dashboard/cd/directives/list.tmpl',
        'icon': 'download',
        'pillar': {
            'name': 'deployment',
            'label': translation.deploy[LANG],
            'position': 3
        },
        'mainMenu': true,
        'tracker': true,
        'order': 6,
        'scripts': ['modules/dashboard/cd/config.js', 'modules/dashboard/cd/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(cdNav);
