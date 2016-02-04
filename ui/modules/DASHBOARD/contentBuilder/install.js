"use strict";

var cbTranslation= {
	"contentBuilder": {
		"ENG": "Content Builder",
		"FRA": "Content Builder"
	},
	"addNewContentBuilder": {
		"ENG": "Add New Content Builder",
		"FRA": "Add New Content Builder"
	},
	"updateContentBuilder": {
		"ENG": "Update Content Builder",
		"FRA": "Update Content Builder"
	}
};

for (var attrname in cbTranslation) {
	translation[attrname] = cbTranslation[attrname];
}

var cbNav =[
	{
		'id': 'content-builder',
		'label': translation.contentBuilder[LANG],
		'checkPermission':{
			'service':'dashboard',
			'route':'/cb/get'
		},
		'url': '#/content-builder',
		'tplPath': 'modules/DASHBOARD/contentBuilder/directives/list.tmpl',
		'icon': 'hammer',
		'pillar':{
			'name': 'development',
			'label': translation.develop[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/DASHBOARD/contentBuilder/config.js', 'modules/DASHBOARD/contentBuilder/controller.js','modules/DASHBOARD/contentBuilder/services/contentBuilder.js','modules/DASHBOARD/contentBuilder/services/input.js','modules/DASHBOARD/contentBuilder/services/api.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'content-builder-add',
		'label': translation.addNewContentBuilder[LANG],
		'url': '#/content-builder/add',
		'tplPath': 'modules/DASHBOARD/contentBuilder/directives/add.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'development',
			'label': translation.develop[LANG],
			'position': 1
		},
		'scripts': ['modules/DASHBOARD/contentBuilder/config.js', 'modules/DASHBOARD/contentBuilder/controller.js','modules/DASHBOARD/contentBuilder/services/contentBuilder.js','modules/DASHBOARD/contentBuilder/services/input.js','modules/DASHBOARD/contentBuilder/services/api.js'],
		'ancestor': [translation.home[LANG], translation.contentBuilder[LANG]]
	},
	{
		'id': 'content-builder-update',
		'label': translation.updateContentBuilder[LANG],
		'url': '#/content-builder/edit/:id',
		'tplPath': 'modules/DASHBOARD/contentBuilder/directives/edit.tmpl',
		'tracker': true,
		'pillar':{
			'name': 'development',
			'label': translation.develop[LANG],
			'position': 1
		},
		'scripts': ['modules/DASHBOARD/contentBuilder/config.js', 'modules/DASHBOARD/contentBuilder/controller.js','modules/DASHBOARD/contentBuilder/services/contentBuilder.js','modules/DASHBOARD/contentBuilder/services/input.js','modules/DASHBOARD/contentBuilder/services/api.js'],
		'ancestor': [translation.home[LANG], translation.contentBuilder[LANG]]
	}
];
navigation = navigation.concat(cbNav);