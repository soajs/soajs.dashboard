"use strict";
var membersNav= [
	{
		'id': 'members',
		'label': 'Members',
		'checkPermission':{
			'service':'urac',
			'route':'/admin/listUsers'
		},
		'url': '#/members',
		'tplPath': 'modules/members/directives/list.tmpl',
		'icon': 'users',
		'userMenu': true,
		'tracker': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/members.js', 'modules/members/services/groups.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'orgchart',
		'label': 'OrgChart',
		'checkPermission':{
			'service':'urac',
			'route':'/admin/listUsers'
		},
		'url': '#/tenants-admins',
		'tplPath': 'modules/members/directives/orgchart.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar':{
			'name': 'management',
			'label': 'Management',
			'position': 2
		},
		'tracker': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/members.js', 'modules/members/services/groups.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'user-acl',
		'label': 'User ACL',
		'url': '#/members/:uId/editUserAcl',
		'tplPath': 'modules/members/directives/editUserAcl.tmpl',
		'tracker': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/acl.js'],
		'ancestor': ['Home', 'Members']
	}
];
navigation = navigation.concat(membersNav);