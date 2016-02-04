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
		'tplPath': 'modules/DEV/contentManagement/directives/list.tmpl',
		'icon': 'newspaper',
		'pillar':{
			'name': 'operate',
			'label': 'Operate',
			'position': 4
		},
		'mainMenu': true,
		'contentMenu': true,
		'tracker': true,
		'scripts': ['modules/DEV/contentManagement/config.js', 'modules/DEV/contentManagement/controller.js', 'modules/DEV/contentManagement/services/contentManagement.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(cmNav);