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
		'mainMenu': true,
		'tracker': true,
		'scripts': ['modules/members/member/config.js', 'modules/members/member/controller.js', 'modules/members/group/config.js', 'modules/members/group/controller.js'],
		'ancestor': ['Home']
	},
	{
		'id': 'user-acl',
		'label': 'User ACL',
		'checkPermission':{
			'service':'urac',
			'route':'/admin/editUser'
		},
		'url': '#/members/:uId/editUserAcl',
		'tplPath': 'modules/members/directives/editUserAcl.tmpl',
		'tracker': true,
		'scripts': ['modules/members/member/config.js', 'modules/members/member/controller.js', 'modules/members/group/config.js', 'modules/members/group/controller.js'],
		'ancestor': ['Home', 'Members']
	}
];