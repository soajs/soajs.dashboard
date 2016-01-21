"use strict";

var ProdTranslation = {
	//install.js
	"productization": {
		"ENG": "Productization",
		"FRA": "Productization"
	},
	"editAppACL": {
		"ENG": "Edit Package ACL",
		"FRA": "Edit Package ACL"
	}
	//config


};

for (var attrname in mtTranslation) {
	translation[attrname] = ProdTranslation[attrname];
}

var productizationNav =[
	{
		'id': 'productization',
		'label': translation.productization[LANG],
		'checkPermission':{
			'service':'dashboard',
			'route':'/product/list'
		},
		'url': '#/productization',
		'tplPath': 'modules/productization/directives/list.tmpl',
		'icon': 'list',
		'pillar':{
			'name': 'management',
			'label': translation.product[LANG],
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js', 'modules/productization/services/productization.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'product-acl',
		'label': translation.editAppACL[LANG],
		'url': '#/productization/:pid/editAcl/:code',
		'tplPath': 'modules/productization/directives/editAcl.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'management',
			'label': translation.product[LANG],
			'position': 2
		},
		'scripts': ['modules/productization/config.js', 'modules/productization/controller.js', 'modules/productization/services/productization.js'],
		'ancestor': [translation.home[LANG], translation.productization[LANG]]
	}
];
navigation = navigation.concat(productizationNav);