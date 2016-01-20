"use strict";

var mtTranslation = {
	"multiTenancy": {
		"ENG": "Multi-Tenancy",
		"FRA": "Multi-Tenancy"
	}
};

for (var attrname in mtTranslation) {
	translation[attrname] = mtTranslation[attrname];
}

var multitenancyNav = [
	{
		'id': 'multi-tenancy',
		'label': translation.multiTenancy[LANG],
		'checkPermission': {
			'service': 'dashboard',
			'route': '/product/list'
		},
		'url': '#/multi-tenancy',
		'tplPath': 'modules/multitenancy/directives/list.tmpl',
		'icon': 'tree',
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js', 'modules/multitenancy/services/multitenancy.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'tenant-app-acl',
		'label': 'Edit Application ACL',
		'url': '#/multi-tenancy/:tId/editAcl/:appId',
		'tplPath': 'modules/multitenancy/directives/editAcl.tmpl',
		'tracker': true,
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'scripts': ['modules/multitenancy/config.js', 'modules/multitenancy/controller.js', 'modules/multitenancy/services/multitenancy.js'],
		'ancestor': ['Home', 'Multi-Tenancy']
	}
];
navigation = navigation.concat(multitenancyNav);