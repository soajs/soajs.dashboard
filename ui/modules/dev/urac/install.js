"use strict";
var uracModuleDev = uiModuleDev + '/urac';

var uracModuleDevTranslation = {
	"uracManagement": {
		"ENG": "Urac Management",
		"FRA": "Urac Management"
	},
	"uracTenantManagement": {
		"ENG": "Tenant Urac Management",
		"FRA": "Tenant Urac Management"
	},
	"manageURAC": {
		"ENG": "Manage URAC",
		"FRA": "Manage URAC"
	},
	"tokensUserId": {
		"ENG": "User",
		"FRA": "User"
	},
	"tokensToken": {
		"ENG": "Token",
		"FRA": "Token"
	},
	"tokensExpires": {
		"ENG": "Expiry Date",
		"FRA": "Date d'expiration"
	},
	"tokensStatus": {
		"ENG": "Status",
		"FRA": "Status"
	},
	"tokensService": {
		"ENG": "Service",
		"FRA": "Service"
	},
	"areYouSureWantDeleteSelectedToken": {
		"ENG": "Are you sure you want to delete selected token(s)",
		"FRA": "Etes vouz sure que vous voulez suprimer le token "
	},
	"errorMessageDeleteToken": {
		"ENG": "Unable to delete Token.",
		"FRA": "Unable to delete Token."
	},
	"successMessageDeleteToken": {
		"ENG": "Token deleted successfully.",
		"FRA": "Token deleted successfully."
	}
};

for (var attrname in uracModuleDevTranslation) {
	translation[attrname] = uracModuleDevTranslation[attrname];
}

var uracModuleDevNav = [
	{
		'id': 'urac-management',
		'label': translation.uracManagement[LANG],
		'url': '#/urac-management',
		'tplPath': uracModuleDev + '/directives/listTenants.tmpl',
		'icon': 'users',
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'mainMenu': true,
		'contentMenu': true,
		'tracker': true,
		'order': 1,
		'scripts': [uracModuleDev + '/config.js', uracModuleDev + '/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'urac-tenant-management',
		'label': translation.uracTenantManagement[LANG],
		'url': '#/urac-management/members',
		'tplPath': uracModuleDev + '/directives/members.tmpl',
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'tracker': true,
		'scripts': [
			uracModuleDev + '/config.js',
			uracModuleDev + '/controller.js',
			uracModuleDev + '/services/members.js',
			uracModuleDev + '/services/groups.js',
			uracModuleDev + '/services/tokens.js'
		],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'urac-user-acl',
		'label': 'Edit User Acl',
		'url': '#/urac-management/:uId/editUserAcl',
		'tplPath': uracModuleDev + '/directives/editUserAcl.tmpl',
		'tracker': true,
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'scripts': [
			uracModuleDev + '/config.js',
			uracModuleDev + '/controller.js',
			uracModuleDev + '/services/acl.js'
		],
		'ancestor': [translation.home[LANG], translation.uracTenantManagement[LANG]]
	}
];

navigation = navigation.concat(uracModuleDevNav);