"use strict";
var servicesNav = [
	{
		'id': 'services',
		'label': 'Services',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/services/list'
		},
		'url': '#/services',
		'tplPath': 'modules/services/directives/list.tmpl',
		'icon': 'cloud',
		'pillar': {
			'name': 'development',
			'label': 'Develop',
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/services/config.js', 'modules/services/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'daemons',
		'label': 'Daemons',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/daemons/list'
		},
		'url': '#/daemons',
		'tplPath': 'modules/services/directives/list-daemons.tmpl',
		'icon': 'evil2',
		'pillar': {
			'name': 'development',
			'label': 'Develop',
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/services/config.js', 'modules/services/controller.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(servicesNav);