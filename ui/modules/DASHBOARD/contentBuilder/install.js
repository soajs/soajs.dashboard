"use strict";
var cbNav =[
	{
		'id': 'content-builder',
		'label': 'Content Builder',
		'checkPermission':{
			'service':'dashboard',
			'route':'/cb/get'
		},
		'url': '#/content-builder',
		'tplPath': 'modules/DASHBOARD/contentBuilder/directives/list.tmpl',
		'icon': 'hammer',
		'pillar':{
			'name': 'development',
			'label': 'Develop',
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/DASHBOARD/contentBuilder/config.js', 'modules/DASHBOARD/contentBuilder/controller.js','modules/DASHBOARD/contentBuilder/services/contentBuilder.js','modules/DASHBOARD/contentBuilder/services/input.js','modules/DASHBOARD/contentBuilder/services/api.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'content-builder-add',
		'label': 'Add New Content Builder',
		'url': '#/content-builder/add',
		'tplPath': 'modules/DASHBOARD/contentBuilder/directives/add.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'development',
			'label': 'Develop',
			'position': 1
		},
		'scripts': ['modules/DASHBOARD/contentBuilder/config.js', 'modules/DASHBOARD/contentBuilder/controller.js','modules/DASHBOARD/contentBuilder/services/contentBuilder.js','modules/DASHBOARD/contentBuilder/services/input.js','modules/DASHBOARD/contentBuilder/services/api.js'],
		'ancestor': ['Home', 'Content Builder']
	},
	{
		'id': 'content-builder-update',
		'label': 'Update Content Builder',
		'url': '#/content-builder/edit/:id',
		'tplPath': 'modules/DASHBOARD/contentBuilder/directives/edit.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'development',
			'label': 'Develop',
			'position': 1
		},
		'scripts': ['modules/DASHBOARD/contentBuilder/config.js', 'modules/DASHBOARD/contentBuilder/controller.js','modules/DASHBOARD/contentBuilder/services/contentBuilder.js','modules/DASHBOARD/contentBuilder/services/input.js','modules/DASHBOARD/contentBuilder/services/api.js'],
		'ancestor': ['Home', 'Content Builder']
	}
];
navigation = navigation.concat(cbNav);