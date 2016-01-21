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
	},
	//config
    "formProductNamePlaceholder": {
        "ENG": "Test Product...",
        "FRA": "Test Product..."
    },
    "formProductNameToolTip": {
        "ENG": "Enter Product Name.",
        "FRA": "Enter Product Name."
    },
    "formProductCodeToolTip": {
        "ENG": "Enter Product Code; maximum 5 characters.",
        "FRA": "Enter Product Code; maximum 5 characters."
    },
    "formProductDescriptionPlaceholder": {
        "ENG": "Testing Product, used by developers and does not reach production server...",
        "FRA": "Testing Product, used by developers and does not reach production server..."
    },
    "formProductDescriptionToolTip": {
        "ENG": "Enter a description explaining the usage of this product",
        "FRA": "Enter a description explaining the usage of this product"
    },
    "formPackageCodeToolTip": {
        "ENG": "Enter Package Code; maximum 5 characters.",
        "FRA": "Enter Package Code; maximum 5 characters."
    },
    "formPackageCodePlaceholder": {
        "ENG": "BASIC...",
        "FRA": "BASIC..."
    },
    "formPackageNamePlaceholder": {
        "ENG": "Test Package...",
        "FRA": "Test Package..."
    },
    "formPackageNameToolTip": {
        "ENG": "Enter Package Name.",
        "FRA": "Enter Package Name."
    },
    "formPackageDescriptionPlaceholder": {
        "ENG": "Testing Package, used by developers and does not reach production server...",
        "FRA": "Testing Package, used by developers and does not reach production server..."
    },
    "formPackageDescriptionToolTip": {
        "ENG": "Enter a description explaining the usage of this package",
        "FRA": "Enter a description explaining the usage of this package"
    },


};

for (var attrname in ProdTranslation) {
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