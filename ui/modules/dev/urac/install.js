"use strict";
var uracModuleDev = 'modules/dev/urac';

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
		'label': translation.uracManagement[LANG],
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
			uracModuleDev + '/services/groups.js'
		],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(uracNav);