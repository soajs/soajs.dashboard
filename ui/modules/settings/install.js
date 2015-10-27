"use strict";
var settingsNav =[
	{
		'id': 'settings',
		'label': 'Settings',
		'checkPermission':{
			'service':'dashboard',
			'route':'/settings/tenant/get'
		},
		'url': '#/settings',
		'tplPath': 'modules/settings/directives/list.tmpl',
		'icon': 'cogs',
		'mainMenu': true,
		'pillar':{
			'name': 'account',
			'label': 'My Account',
			'position': 5
		},
		'tracker': true,
		'scripts': ['modules/settings/config.js', 'modules/settings/controller.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(settingsNav);