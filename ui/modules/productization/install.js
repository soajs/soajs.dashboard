"use strict";
var productizationNav = [
	{
		'id': 'productization',
		'label': 'Productization',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/product/list'
		},
		'url': '#/productization',
		'tplPath': 'modules/productization/directives/list.tmpl',
		'icon': 'list',
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js', 'modules/productization/services/productization.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'product-acl',
		'label': 'Edit Package ACL',
		'url': '#/productization/:pid/editAcl/:code',
		'tplPath': 'modules/productization/directives/editAcl.tmpl',
		'tracker': true,
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js', 'modules/productization/services/productization.js'],
		'ancestor': [translation.home[LANG], 'Productization']
	}
];
navigation = navigation.concat(productizationNav);