"use strict";
var environmentsNav = [
	{
		'id': 'environments',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/list'
		},
		'label': 'Registries',
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
		'scripts': ['modules/environments/config.js','modules/environments/services/template.js', 'modules/environments/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'environments-dbs',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/dbs/list'
		},
		'label': 'Databases',
		'url': '#/environments-dbs',
		'tplPath': 'modules/environments/directives/list-databases.tmpl',
		'icon': 'database',
		'pillar':{
			'name': 'deployment',
			'label': 'deployment',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/dbs-ctrl.js', 'modules/environments/services/database.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'environments-clusters',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/clusters/list'
		},
		'label': 'Clusters',
		'url': '#/environments-clusters',
		'tplPath': 'modules/environments/directives/list-clusters.tmpl',
		'icon': 'stack',
		'pillar':{
			'name': 'deployment',
			'label': 'deployment',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/clusters-ctrl.js', 'modules/environments/services/clusters.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'environments-hosts',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/hosts/list'
		},
		'label': 'Hosts',
		'url': '#/environments-hosts',
		'tplPath': 'modules/environments/directives/list-hosts.tmpl',
		'icon': 'sphere',
		'pillar':{
			'name': 'deployment',
			'label': 'deployment',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/environments/config.js', 'modules/environments/hosts-ctrl.js', 'modules/environments/services/hosts.js', 'modules/environments/services/deploy.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'oneEnvironment',
		'label': 'Environments',
		'url': '#/environments/environment/:id?',
		'tplPath': 'modules/environments/directives/edit.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'deployment',
			'label': 'deployment',
			'position': 3
		},
		'scripts': ['modules/environments/config.js', 'modules/environments/controller.js', 'modules/environments/services/clusters.js', 'modules/environments/services/database.js', 'modules/environments/services/hosts.js', 'modules/environments/services/deploy.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(environmentsNav);