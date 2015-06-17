"use strict";
var cmNav =[
	{
		'id': 'content-management',
		'label': 'Content Management',
		//'checkPermission':{
		//	'service':'dashboard',
		//	'route':'/cb/list'
		//},
		'url': '#/content-management',
		'tplPath': 'modules/contentManagement/directives/list.tmpl',
		'icon': 'newspaper',
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/contentManagement/config.js', 'modules/contentManagement/controller.js'],
		'ancestor': ['Home']
	}
];
navigation = navigation.concat(cmNav);