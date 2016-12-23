"use strict";

var ProdTranslation = {
	//install.js
	"productization": {
		"ENG": "Productization",
		"FRA": "Productization"
	},
	"editPackageACL": {
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
	//controller
	"addNewProduct": {
		"ENG": "Add New Product",
		"FRA": "Add New Product"
	},
	"addProduct": {
		"ENG": "Add Product",
		"FRA": "Add Product"
	},
	"editProduct": {
		"ENG": "Edit Product",
		"FRA": "Edit Product"
	},
	"addNewPackage": {
		"ENG": "Add New Package",
		"FRA": "Add New Package"
	},
	"addPackage": {
		"ENG": "Add Package",
		"FRA": "Add Package"
	},
	"editPackage": {
		"ENG": "Edit Package",
		"FRA": "Edit Package"
	},
	"areYouSureWantRemoveProduct": {
		"ENG": "Are you sure you want to remove this product?",
		"FRA": "Are you sure you want to remove this product?"
	},
	"productRemovedSuccessfully": {
		"ENG": "Product removed successfully.",
		"FRA": "Product removed successfully."
	},
	"productAddedSuccessfully": {
		"ENG": "Product Added successfully.",
		"FRA": "Product Added successfully."
	},
	"productUpdatedSuccessfully": {
		"ENG": "Product Updated successfully.",
		"FRA": "Product Updated successfully."
	},
	"selectedPackageRemoved": {
		"ENG": "Selected Package has been removed.",
		"FRA": "Selected Package has been removed."
	},
	//editAcl
	"modifyACLPackage": {
		"ENG": "Modify ACL of Package",
		"FRA": "Modify ACL of Package"
	},
	//list
	"areYouSureWantRemoveSelectedPackage": {
		"ENG": "Are you sure you want to remove the selected package",
		"FRA": "Are you sure you want to remove the selected package"
	},
	"removePackage": {
		"ENG": "Remove Package",
		"FRA": "Remove Package"
	},
	"expandPackages": {
		"ENG": "Expand Packages",
		"FRA": "Expand Packages"
	},
	"collapsePackages": {
		"ENG": "Collapse Packages",
		"FRA": "Collapse Packages"
	},
	"removeProduct": {
		"ENG": "Remove Product",
		"FRA": "Remove Product"
	}
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
			'route':'/product/list',
			'method': 'get'
		},
		'url': '#/productization',
		'tplPath': 'modules/dashboard/productization/directives/list.tmpl',
		'icon': 'list',
		'pillar':{
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'order': 1,
		'scripts': ['modules/dashboard/productization/config.js', 'modules/dashboard/productization/controller.js', 'modules/dashboard/productization/services/productization.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'product-acl',
		'label': translation.editPackageACL[LANG],
		'url': '#/productization/:pid/editAcl/:code',
		'tplPath': 'modules/dashboard/productization/directives/editAcl.tmpl',
		'tracker': true,
		'checkPermission':{
			'service':'dashboard',
			'route':'/product/packages/update',
			'method': 'put'
		},
		'pillar':{
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'scripts': ['modules/dashboard/productization/config.js', 'modules/dashboard/productization/controller.js', 'modules/dashboard/productization/services/productization.js'],
		'ancestor': [translation.home[LANG], translation.productization[LANG]]
	}
];
navigation = navigation.concat(productizationNav);