"use strict";
var cmNav =[
	{
		'id': 'content-management',
		'label': 'Content Management',
		'checkPermission':{
			'service':'dashboard',
			'route':'/cb/list'
		},
		'url': '#/content-management',
		'tplPath': 'modules/contentManagement/directives/list.tmpl',
		'icon': 'newspaper',
		'pillar':{
			'name': 'dashboard',
			'label': 'Operate',
			'position': 4
		},
		'mainMenu': true,
		'contentMenu': true,
		'tracker': true,
		'scripts': ['modules/contentManagement/config.js', 'modules/contentManagement/controller.js', 'modules/contentManagement/services/contentManagement.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(cmNav);