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
		'tracker': true,
		'scripts': ['modules/settings/config.js', 'modules/settings/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'aclSettings',
		'label': 'ACL Settings',
		'checkPermission':{

		},
		'url': '#/settings/:tId/editAcl/:appId',
		'tplPath': 'modules/settings/directives/acl.tmpl',

		'tracker': true,
		'scripts': ['modules/settings/config.js', 'modules/settings/controller.js'],
		'ancestor': ['Home']
	}

];