"use strict";
var swaggerEditorNav = [
	{
		'id': 'swaggerEditor',
		'label': 'Swagger Editor',
		'checkPermission': {
			'service': 'dashboard',
			'route': '/swagger/generate'
		},
		'url': '#/swaggerEditor',
		'tplPath': 'modules/dashboard/swaggerEditor/directives/swaggerEditor.tmpl',
		'icon': 'magic-wand',
		'pillar': {
			'name': 'development',
			'label': translation.develop[LANG],
			'position': 1
		},
		'mainMenu': true,
		'tracker': true,
		'order': 6,
		'scripts': ['modules/dashboard/swaggerEditor/config.js', 'modules/dashboard/swaggerEditor/controller.js', 'modules/dashboard/swaggerEditor/service.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(swaggerEditorNav);
