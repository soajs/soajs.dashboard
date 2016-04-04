'use strict';
var gaTranslation = {};

for (var attrname in gaTranslation) {
    translation[attrname] = scTranslation[attrname];
}

var gitAccountsNav = [
    {
        'id': 'git-accounts',
        'label': "Git Accounts",
        'checkPermission': {
            'service': 'dashboard',
            'route': '/github/listAccounts'
        },
        'url': '#/git-accounts',
        'tplPath': 'modules/DASHBOARD/gitAccounts/directives/list.tmpl',
        'icon': 'git',
        'pillar': {
            'name': 'development',
            'label': translation.develop[LANG],
            'position': 1
        },
        'mainMenu': true,
        'tracker': true,
        'order': 4,
        'scripts': ['modules/DASHBOARD/gitAccounts/config.js', 'modules/DASHBOARD/gitAccounts/controller.js'],
        'ancestor': [translation.home[LANG]]
    }
];
navigation = navigation.concat(gitAccountsNav);