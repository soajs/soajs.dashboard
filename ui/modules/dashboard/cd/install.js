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
		'excludedEnvs': ['dashboard'],
		'mainMenu': true,
		'tracker': true,
		'order': 3,
		'scripts': ['modules/dashboard/cd/config.js', 'modules/dashboard/cd/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
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
		'order': 9,
		'scripts': ['modules/dashboard/cd/config.js', 'modules/dashboard/cd/controller.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(cdNav);
