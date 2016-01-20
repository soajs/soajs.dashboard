"use strict";

var membersTranslation = {
	"tenantOrganizationChart": {
		"ENG": "Tenant Organization Chart",
		"FRA": "Tenant Organization Chart"
	}
};

for (var attrname in membersTranslation) {
	translation[attrname] = membersTranslation[attrname];
}

var membersNav = [
	{
		'id': 'tenants-members',
		'label': translation.tenantOrganizationChart[LANG],
		'checkPermission': {
			'service': 'urac',
			'route': '/admin/all'
		},
		'url': '#/tenants-members',
		'tplPath': 'modules/members/directives/tenant.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'tracker': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/members.js', 'modules/members/services/groups.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'members',
		'label': 'My Organization Chart',
		'checkPermission': {
			'service': 'urac',
			'route': '/admin/listUsers'
		},
		'url': '#/members',
		'tplPath': 'modules/members/directives/list.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'tracker': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/members.js', 'modules/members/services/groups.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'user-acl',
		'label': 'User ACL',
		'url': '#/members/:uId/editUserAcl',
		'tplPath': 'modules/members/directives/editUserAcl.tmpl',
		'tracker': true,
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/acl.js'],
		'ancestor': [translation.home[LANG], 'Members']
	}
];
navigation = navigation.concat(membersNav);