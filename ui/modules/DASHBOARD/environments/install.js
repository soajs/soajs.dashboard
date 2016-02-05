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
		'tplPath': 'modules/DASHBOARD/environments/directives/list.tmpl',
		'icon': 'earth',
		'pillar':{
			'name': 'deployment',
			'label': 'Deploy',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/DASHBOARD/environments/config.js','modules/DASHBOARD/environments/services/template.js', 'modules/DASHBOARD/environments/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'environments-platforms',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/environment/platforms/list'
		},
		'label': 'Platforms',
		'url': '#/environments-platforms',
		'tplPath': 'modules/DASHBOARD/environments/directives/list-platforms.tmpl',
		'icon': 'download3',
		'pillar': {
			'name': 'deployment',
			'label': 'Deploy',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/DASHBOARD/environments/config.js', 'modules/DASHBOARD/environments/platforms-ctrl.js', 'modules/DASHBOARD/environments/services/platforms.js'],
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
		'tplPath': 'modules/DASHBOARD/environments/directives/list-clusters.tmpl',
		'icon': 'stack',
		'pillar':{
			'name': 'deployment',
			'label': 'Deploy',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/DASHBOARD/environments/config.js', 'modules/DASHBOARD/environments/clusters-ctrl.js', 'modules/DASHBOARD/environments/services/clusters.js'],
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
		'tplPath': 'modules/DASHBOARD/environments/directives/list-databases.tmpl',
		'icon': 'database',
		'pillar':{
			'name': 'deployment',
			'label': 'Deploy',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/DASHBOARD/environments/config.js', 'modules/DASHBOARD/environments/dbs-ctrl.js', 'modules/DASHBOARD/environments/services/database.js'],
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
		'tplPath': 'modules/DASHBOARD/environments/directives/list-hosts.tmpl',
		'icon': 'sphere',
		'pillar':{
			'name': 'deployment',
			'label': 'Deploy',
			'position': 3
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/DASHBOARD/environments/config.js', 'modules/DASHBOARD/environments/hosts-ctrl.js', 'modules/DASHBOARD/environments/services/hosts.js', 'modules/DASHBOARD/environments/services/deploy.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'oneEnvironment',
		'label': 'Environments',
		'url': '#/environments/environment/:id?',
		'tplPath': 'modules/DASHBOARD/environments/directives/edit.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'deployment',
			'label': 'Deploy',
			'position': 3
		},
		'scripts': ['modules/DASHBOARD/environments/config.js', 'modules/DASHBOARD/environments/controller.js', 'modules/DASHBOARD/environments/services/clusters.js', 'modules/DASHBOARD/environments/services/database.js', 'modules/DASHBOARD/environments/services/hosts.js', 'modules/DASHBOARD/environments/services/deploy.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(environmentsNav);