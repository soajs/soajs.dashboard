"use strict";
var uracModuleProd = uiModuleProd + '/urac';

var uracModuleProdTranslation = {
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
	},
	"tokens": {
		"ENG": "Tokens",
		"FRA": "Tokens"
	}
};

for (var attrname in uracModuleProdTranslation) {
	translation[attrname] = uracModuleProdTranslation[attrname];
}

var uracModuleProdNav = [
	{
		'id': 'urac-management',
		'label': translation.uracManagement[LANG],
		'url': '#/urac-management',
		'tplPath': uracModuleProd + '/directives/listTenants.tmpl',
		'icon': 'users',
		'checkPermission': {
			'service': 'urac',
			'route': '/owner/admin/listUsers',
			'method': 'get'
		},
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'mainMenu': true,
		'contentMenu': true,
		'tracker': true,
		'order': 100,
		'scripts': [uracModuleProd + '/config.js', uracModuleProd + '/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'urac-tenant-management',
		'label': translation.uracTenantManagement[LANG],
		'url': '#/urac-management/members',
		'tplPath': uracModuleProd + '/directives/members.tmpl',
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'checkPermission': {
			'service': 'urac',
			'route': '/owner/admin/listUsers',
			'method': 'get'
		},
		'tracker': true,
		'scripts': [
			uracModuleProd + '/config.js',
			uracModuleProd + '/controller.js',
			uracModuleProd + '/services/members.js',
			uracModuleProd + '/services/groups.js',
			uracModuleProd + '/services/tokens.js'
		],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'urac-user-acl',
		'label': 'Edit User Acl',
		'url': '#/urac-management/:uId/editUserAcl',
		'tplPath': uracModuleProd + '/directives/editUserAcl.tmpl',
		'tracker': true,
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'checkPermission': {
			'service': 'urac',
			'route': '/owner/admin/editUser',
			'method': 'post'
		},
		'scripts': [
			uracModuleProd + '/config.js',
			uracModuleProd + '/controller.js',
			uracModuleProd + '/services/acl.js'
		],
		'ancestor': [translation.home[LANG], translation.uracTenantManagement[LANG]]
	}
];

navigation = navigation.concat(uracModuleProdNav);