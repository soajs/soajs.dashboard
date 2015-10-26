"use strict";
var productizationNav =[
	{
		'id': 'productization',
		'label': 'Productization',
		'checkPermission':{
			'service':'dashboard',
			'route':'/product/list'
		},
		'url': '#/productization',
		'tplPath': 'modules/productization/directives/list.tmpl',
		'icon': 'list',
		'pillar':{
			'name': 'management',
			'label': 'Management',
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js', 'modules/productization/services/productization.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'product-acl',
		'label': 'Edit Package ACL',
		'url': '#/productization/:pid/editAcl/:code',
		'tplPath': 'modules/productization/directives/editAcl.tmpl',
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js', 'modules/productization/services/productization.js'],
		'ancestor': ['Home', 'Productization']
	}
];
navigation = navigation.concat(productizationNav);