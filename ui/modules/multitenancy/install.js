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
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js','modules/multitenancy/services/multitenancy.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'tenant-app-acl',
		'label': 'Edit Application ACL',
		'url': '#/multi-tenancy/:tId/editAcl/:appId',
		'tplPath': 'modules/multitenancy/directives/editAcl.tmpl',
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js','modules/multitenancy/services/multitenancy.js'],
		'ancestor': ['Home', 'Multi-Tenancy']
	}
];