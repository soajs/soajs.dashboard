"use strict";
var stTranslation = {
	"settings": {
		"ENG": "Settings",
		"FRA": "Settings"
	},
	"tenantApplications": {
		"ENG": "Tenant Applications",
		"FRA": "Tenant Applications"
	},
	"noApplicationsAdded":{
		"ENG":"No applications have been added.",
		"FRA":"No applications have been added"
	},
	"noAauthUsersAdded":{
		"ENG":"No oauth users have been added.",
		"FRA":"No oauth users have been added."
	}
};

for (var attrname in stTranslation) {
	translation[attrname] = stTranslation[attrname];
}

var settingsNav = [
	{
		'id': 'settings',
		'label': translation.settings[LANG],
		'checkPermission': {
			'service': 'dashboard',
			'route': '/settings/tenant/get',
			'method': 'get'
		},
		'url': '#/settings',
		'tplPath': 'modules/dashboard/settings/directives/list.tmpl',
		'icon': 'cogs',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': translation.manage[LANG],
			'position': 2
		},
		'tracker': true,
		'order': 5,
		'scripts': ['modules/dashboard/settings/config.js', 'modules/dashboard/settings/controller.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(settingsNav);