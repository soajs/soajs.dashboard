'use strict';
var gaTranslation = {};

for (var attrname in gaTranslation) {
    translation[attrname] = scTranslation[attrname];
}

var staticContentNav = [
    {
        'id': 'github-app',
        'label': "GitHub App",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/github/getRepos'
        },
        'url': '#/github-app',
        'tplPath': 'modules/DASHBOARD/githubApp/directives/list.tmpl',
        'icon': 'github',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 4,
        'scripts': ['modules/DASHBOARD/githubApp/config.js', 'modules/DASHBOARD/githubApp/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(staticContentNav);