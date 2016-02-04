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
			'route': '/settings/tenant/get'
		},
		'url': '#/settings',
		'tplPath': 'modules/DASHBOARD/settings/directives/list.tmpl',
		'icon': 'cogs',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': 'Product',
			'position': 2
		},
		'tracker': true,
		'scripts': ['modules/DASHBOARD/settings/config.js', 'modules/DASHBOARD/settings/controller.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(settingsNav);