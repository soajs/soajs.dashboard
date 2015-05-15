"use strict";
var environmentsNav= [
	{
		'id': 'environments',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/list'
		},
		'label': 'Environments',
		'url': '#/environments',
		'tplPath': 'modules/environments/directives/list.tmpl',
		'icon': 'earth',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'oneEnvironment',
		'label': 'Environments',
		'url': '#/environments/environment/:id?',
		'tplPath': 'modules/environments/directives/edit.tmpl',
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(environmentsNav);