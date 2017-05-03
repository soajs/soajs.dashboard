"use strict";

var mtTranslation = {
	//install.js
	"editAppACL": {
		"ENG": "Edit Application ACL",
		"FRA": "Edit Application ACL"
	},
	//config.js
	"role": {
		"ENG": "Role",
		"FRA": "Role"
	},
	"productTenant": {
		"ENG": "Product Tenant",
		"FRA": "Product Tenant"
	},
	"clientTenant": {
		"ENG": "Client Tenant",
		"FRA": "Client Tenant"
	},
	"tag": {
		"ENG": "Tag",
		"FRA": "Tag"
	},
	"formCodePlaceholder": {
		"ENG": "TEST",
		"FRA": "TEST"
	},
	"formTntCodeToolTip": {
		"ENG": "Enter Tenant Code; maximum 4 characters.",
		"FRA": "Enter Tenant Code;"
	},
	"formTntTypeToolTip": {
		"ENG": "Choose Tenant Role",
		"FRA": "Choose Tenant Role"
	},
	"formTntTypeFieldMsg": {
		"ENG": "Specify where this tenant is used",
		"FRA": "Specify where this tenant is used"
	},
	"addTenant": {
		"ENG": "Add Tenant",
		"FRA": "Add Tenant"
	},
	"formEmailPlaceHolder": {
		"ENG": "Tenant Administrator Email Address. Example: admin@tenant.com",
		"FRA": "Tenant Administrator Email Address. Example: admin@tenant.com"
	},
	"formEmailToolTip": {
		"ENG": "Enter Tenant Administrator Email.",
		"FRA": "Enter Tenant Administrator Email."
	},
	"dashboardPackage": {
		"ENG": "Dashboard Package",
		"FRA": "Dashboard Package"
	},
	"formDashboardPackagePlaceHolder": {
		"ENG": "Choose a package for this tenant",
		"FRA": "Choose a package for this tenant"
	},
	"formDashboardPackageToolTip": {
		"ENG": "If this tenant logs in to the dashboard, pick a package for it from the list above.",
		"FRA": "If this tenant logs in to the dashboard, pick a package for it from the list above."
	},
	"userId": {
		"ENG": "user Id",
		"FRA": "user Id"
	},
	"formpProductPlaceHolder": {
		"ENG": "Enter the product code from productization section...",
		"FRA": "Enter the product code from productization section..."
	},
	"productPackage": {
		"ENG": "Product Package",
		"FRA": "Product Package"
	},
	"formProductPackagePlaceHolder": {
		"ENG": "Enter the package code from productization section...",
		"FRA": "Enter the package code from productization section..."
	},
	"formProductPackageToolTip": {
		"ENG": "Choose Product Package Code.",
		"FRA": "Choose Product Package Code."
	},
	"formProductPackageDescriptionPlaceHolder": {
		"ENG": "Testing Application, used by developers and does not reach production server...",
		"FRA": "Testing Application, used by developers and does not reach production server..."
	},
	"editTenantOauth": {
		"ENG": "Configure oAuth security",
		"FRA": "Modifie Tenant's oAuth Information"
	},
	"editBasicTenantApplication": {
		"ENG": "Edit Basic Tenant Information",
		"FRA": "Modifie Basic Tenant Information"
	},
	"environment": {
		"ENG": "Environment",
		"FRA": "Environment"
	},
	"selectEnvironment": {
		"ENG": "Select Environment",
		"FRA": "Select Environment"
	},
	//controller
	"client": {
		"ENG": "Client",
		"FRA": "Client"
	},
	"updateOAuth": {
		"ENG": "Update oAuth",
		"FRA": "Update oAuth"
	},
	"turnOnOAuth": {
		"ENG": "Turn on oAuth",
		"FRA": "Turn on oAuth"
	},
	"turnOffOAuth": {
		"ENG": "Turn off oAuth",
		"FRA": "Turn off oAuth"
	},
	"oAuthType": {
		"ENG": "oAuth type",
		"FRA": "oAuth type"
	},
	"updateTenant": {
		"ENG": "Update Tenant",
		"FRA": "Update Tenant"
	},
	"addNewTenant": {
		"ENG": "Add New Tenant",
		"FRA": "Add New Tenant"
	},
	"addNewApplication": {
		"ENG": "Add New Application",
		"FRA": "Add New Application"
	},
	"addApplication": {
		"ENG": "Add Application",
		"FRA": "Add Application"
	},
	"editApplication": {
		"ENG": "Edit Application",
		"FRA": "Edit Application"
	},
	"areYouSureWantRemoveTenant": {
		"ENG": "Are you sure you want to remove this tenant?",
		"FRA": "Are you sure you want to remove this tenant?"
	},
	"youNeedToChangeOneGroupAccessTypeGroups": {
		"ENG": "You need to choose at least one group when the access type is set to Groups",
		"FRA": "You need to choose at least one group when the access type is set to Groups"
	},
	"choosePackage": {
		"ENG": "Choose a package.",
		"FRA": "Choose a package."
	},
	"applicationUpdatedSuccessfully": {
		"ENG": "Application Updated Successfully",
		"FRA": "Application Updated Successfully"
	},
	"selectedAppRemoved": {
		"ENG": "Selected Application has been removed",
		"FRA": "Selected Application has been removed"
	},

	//directives

	//editAcl
	"updateACLTenantApplication": {
		"ENG": "Update ACL of Tenant Application",
		"FRA": "Update ACL of Tenant Application"
	},
	//list
	//No tenants of type {{tab.label}} have been added yet
	//{
	"noTenantsOfType": {
		"ENG": "No tenants of type",
		"FRA": "No tenants of type"
	},
	"haveBeenAddedYet": {
		"ENG": "have been added yet",
		"FRA": "have been added yet"
	},
	//}

	//listKeys
	"status": {
		"ENG": "Status",
		"FRA": "Status"
	},
	"valid": {
		"ENG": "Valid",
		"FRA": "Valid"
	},
	"deprecated": {
		"ENG": "Deprecated",
		"FRA": "Deprecated"
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
			'route': '/product/list',
			'method': 'get'
		},
		'url': '#/multi-tenancy',
		'tplPath': 'modules/dashboard/multitenancy/directives/list.tmpl',
		'icon': 'tree',
		'pillar': {
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'mainMenu': true,
		'tracker': true,
		'order': 2,
		'scripts': ['modules/dashboard/multitenancy/config.js', 'modules/dashboard/multitenancy/controller.js', 'modules/dashboard/multitenancy/services/multitenancy.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'tenant-app-acl',
		'label': translation.editAppACL[LANG],
		'url': '#/multi-tenancy/:tId/editAcl/:appId',
		'tplPath': 'modules/dashboard/multitenancy/directives/editAcl.tmpl',
		'tracker': true,
		'checkPermission':{
			'service':'dashboard',
			'route':'/tenant/application/update',
			'method': 'put'
		},
		'pillar': {
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'scripts': ['modules/dashboard/multitenancy/config.js', 'modules/dashboard/multitenancy/controller.js', 'modules/dashboard/multitenancy/services/multitenancy.js'],
		'ancestor': [translation.home[LANG], translation.multiTenancy[LANG]]
	}
];
navigation = navigation.concat(multitenancyNav);
