"use strict";

var memTranslation = {
	"uracManagement": {
		"ENG": "Urac Management",
		"FRA": "Urac Management"
	},
	"manageURAC": {
		"ENG": "Manage URAC",
		"FRA": "Manage URAC"
	}
};

for (var attrname in memTranslation) {
	translation[attrname] = memTranslation[attrname];
}

var uracNav = [
	{
		'id': 'urac-management',
		'label': translation.uracManagement[LANG],
		'url': '#/urac-management',
		'tplPath': 'modules/DEV/urac/directives/listTenants.tmpl',
		'icon': 'newspaper',
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'mainMenu': true,
		'contentMenu': true,
		'tracker': true,
		'order': 99,
		'scripts': ['modules/DEV/urac/config.js', 'modules/DEV/urac/controller.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'urac-tenant-management',
		'label': translation.uracManagement[LANG],
		'url': '#/urac-management/members',
		'tplPath': 'modules/DEV/urac/directives/members.tmpl',
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'tracker': true,
		'scripts': [
			'modules/DEV/urac/config.js', 
			'modules/DEV/urac/controller.js',
			'modules/DEV/urac/services/members.js',
			'modules/DEV/urac/services/groups.js'
		],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(uracNav);