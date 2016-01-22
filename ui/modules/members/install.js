"use strict";

var membersTranslation = {
	"tenantOrganizationChart": {
		"ENG": "Tenant Organization Chart",
		"FRA": "Tenant Organization Chart"
	},
	"addNewMember": {
		"ENG": "Add New Member",
		"FRA": "Ajouter New Member"
	},
	"addNewGroup":{
		"ENG":"Add New Group",
		"FRA":"Ajouter New Group"
	},
	"myOrganizationChart":{
		"ENG":"My Organization Chart",
		"FRA":"My Organization Chart"
	},
	"userACL":{
		"ENG":"User ACL",
		"FRA":"User ACL"
	},
	//constroller
	"needToChooseGroupAccessTypeSetGroups":{
		"ENG":"You need to choose at least one group when the access type is set to Groups",
		"FRA":"You need to choose at least one group when the access type is set to Groups"
	},
	"userAclDeletedSuccessfully'":{
		"ENG":"User Acl Deleted Successfully",
		"FRA":"User Acl Deleted Successfully"
	},
	//config
	"enterUsername":{
		"ENG":"Enter Username",
		"FRA":"Enter Username"
	},
	"enterEmail":{
		"ENG":"Enter Email",
		"FRA":"Enter Email"
	},
	"enterFirstName":{
		"ENG":"Enter First Name",
		"FRA":"Enter First Name"
	},
	"enterFirstNameUser":{
		"ENG":"Enter the First Name of the User",
		"FRA":"Enter the First Name of the User"
	},
	"enterLastName":{
		"ENG":"Enter Last Name",
		"FRA":"Enter Last Name"
	},
	"enterLastNameUser":{
		"ENG":"Enter the Last Name of the User",
		"FRA":"Enter the Last Name of the User"
	},
};

for (var attrname in membersTranslation) {
	translation[attrname] = membersTranslation[attrname];
}

var membersNav = [
	{
		'id': 'tenants-members',
		'label': translation.tenantOrganizationChart[LANG],
		'checkPermission': {
			'service': 'urac',
			'route': '/admin/all'
		},
		'url': '#/tenants-members',
		'tplPath': 'modules/members/directives/tenant.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': translation.product[LANG],
			'position': 2
		},
		'tracker': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/members.js', 'modules/members/services/groups.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'members',
		'label': translation.myOrganizationChart[LANG],
		'checkPermission': {
			'service': 'urac',
			'route': '/admin/listUsers'
		},
		'url': '#/members',
		'tplPath': 'modules/members/directives/list.tmpl',
		'icon': 'users',
		'mainMenu': true,
		'pillar': {
			'name': 'management',
			'label': translation.product[LANG],
			'position': 2
		},
		'tracker': true,
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/members.js', 'modules/members/services/groups.js'],
		'ancestor': [translation.home[LANG]]
	},
	{
		'id': 'user-acl',
		'label': translation.userACL[LANG],
		'url': '#/members/:uId/editUserAcl',
		'tplPath': 'modules/members/directives/editUserAcl.tmpl',
		'tracker': true,
		'pillar': {
			'name': 'management',
			'label': translation.product[LANG],
			'position': 2
		},
		'scripts': ['modules/members/config.js', 'modules/members/controller.js', 'modules/members/services/acl.js'],
		'ancestor': [translation.home[LANG], translation.member[LANG]]
	}
];
navigation = navigation.concat(membersNav);