"use strict";
var multitenancyNav =[
	{
		'id': 'multi-tenancy',
		'label': 'Multi-Tenancy',
		'checkPermission':{
			'service':'dashboard',
			'route':'/tenant/list'
		},
		'url': '#/multi-tenancy',
		'tplPath': 'modules/multitenancy/directives/list.tmpl',
		'icon': 'tree',
		'pillar':{
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js','modules/multitenancy/services/multitenancy.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'dashboard-tenants',
		'label': 'Dashboard Tenants',
		'checkPermission':{
			'service':'dashboard',
			'route':'/tenant/db/keys/list'
		},
		'url': '#/dashboard-tenants',
		'tplPath': 'modules/multitenancy/directives/db-keys.tmpl',
		'icon': 'key',
		'pillar':{
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'tenant-app-acl',
		'label': 'Edit Application ACL',
		'url': '#/multi-tenancy/:tId/editAcl/:appId',
		'tplPath': 'modules/multitenancy/directives/editAcl.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js','modules/multitenancy/services/multitenancy.js'],
		'ancestor': ['Home', 'Multi-Tenancy']
	}
];
navigation = navigation.concat(multitenancyNav);