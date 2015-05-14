"use strict";
var servicesNav =[
	{
		'id': 'services',
		'label': 'Services',
		'checkPermission':{
			'service':'dashboard',
			'route':'/services/list'
		},
		'url': '#/services',
		'tplPath': 'modules/services/directives/list.tmpl',
		'icon': 'tree',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/services/config.js', 'modules/services/controller.js'],
		'ancestor': ['Home']
	}
];