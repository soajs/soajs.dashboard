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
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'product-acl',
		'label': 'Edit Package ACL',
		'checkPermission':{
			'service':'dashboard',
			'route':'/product/update'
		},
		'url': '#/productization/:pid/editAcl/:code',
		'tplPath': 'modules/productization/directives/editAcl.tmpl',
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js'],
		'ancestor': ['Home', 'Productization']
	}
];