"use strict";
var environmentsNav = [
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
		'pillar':{
			'name': 'deployment',
			'label': 'deployment',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/environments/config.js','modules/environments/services/template.js', 'modules/environments/controller.js', 'modules/environments/services/clusters.js', 'modules/environments/services/database.js', 'modules/environments/services/hosts.js', 'modules/environments/services/deploy.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'oneEnvironment',
		'label': 'Environments',
		'url': '#/environments/environment/:id?',
		'tplPath': 'modules/environments/directives/edit.tmpl',
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js', 'modules/environments/services/clusters.js', 'modules/environments/services/database.js', 'modules/environments/services/hosts.js', 'modules/environments/services/deploy.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(environmentsNav);