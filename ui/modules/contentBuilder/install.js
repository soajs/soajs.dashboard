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
		'tplPath': 'modules/contentBuilder/directives/list.tmpl',
		'icon': 'hammer',
		'pillar':{
			'name': 'development',
			'label': 'Development',
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/contentBuilder/config.js', 'modules/contentBuilder/controller.js','modules/contentBuilder/services/contentBuilder.js','modules/contentBuilder/services/input.js','modules/contentBuilder/services/api.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'content-builder-add',
		'label': 'Add New Content Builder',
		'url': '#/content-builder/add',
		'tplPath': 'modules/contentBuilder/directives/add.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'development',
			'label': 'Development',
			'position': 1
		},
		'scripts': ['modules/contentBuilder/config.js', 'modules/contentBuilder/controller.js','modules/contentBuilder/services/contentBuilder.js','modules/contentBuilder/services/input.js','modules/contentBuilder/services/api.js'],
		'ancestor': ['Home', 'Content Builder']
	},
	{
		'id': 'content-builder-update',
		'label': 'Update Content Builder',
		'url': '#/content-builder/edit/:id',
		'tplPath': 'modules/contentBuilder/directives/edit.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'development',
			'label': 'Development',
			'position': 1
		},
		'scripts': ['modules/contentBuilder/config.js', 'modules/contentBuilder/controller.js','modules/contentBuilder/services/contentBuilder.js','modules/contentBuilder/services/input.js','modules/contentBuilder/services/api.js'],
		'ancestor': ['Home', 'Content Builder']
	}
];
navigation = navigation.concat(cbNav);