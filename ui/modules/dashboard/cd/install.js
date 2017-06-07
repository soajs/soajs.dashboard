'use strict';

var cdNav = [
	{
		'id': 'updates-upgrades',
		'label': "Update & Upgrades",
		'checkPermission': {
			'service': 'dashboard',
			'route': '/cd',
			'method': 'get'
		},
		'url': '#/updates-upgrades',
		'tplPath': 'modules/dashboard/cd/directives/updates-upgrades.tmpl',
		'icon': 'drive',
		'pillar': {
			'name': 'deployment',
			'label': translation.deploy[LANG],
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'order': 7,
		'scripts': ['modules/dashboard/cd/config.js', 'modules/dashboard/cd/controller.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(cdNav);
