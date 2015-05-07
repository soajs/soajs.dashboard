"use strict";
var settingsNav =[
	{
		'id': 'settings',
		'label': 'Settings',
		'checkPermission':{
			'service':'dashboard',
			'route':'/tenant/list'
		},
		'url': '#/settings',
		'tplPath': 'modules/settings/directives/list.tmpl',
		'icon': 'cogs',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/settings/config.js', 'modules/settings/controller.js'],
		'ancestor': ['Home']
	}
];