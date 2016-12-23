"use strict";

var usersModuleDevConfig = {
	apiEndLimit: 1000,
	
	permissions: {
		'adminUser': {
			'list': ['urac', '/owner/admin/listUsers','get'],
			'changeStatusAccess': ['urac', '/owner/admin/changeUserStatus','get'],
			'editUser': ['urac', '/owner/admin/editUser','post'],
			'editUserConfig': ['urac', '/owner/admin/editUserConfig','post'],
			'addUser': ['urac', '/owner/admin/addUser','post']
		},
		'adminGroup': {
			'list': ['urac', '/owner/admin/group/list','get'],
			'add': ['urac', '/owner/admin/group/add','post'],
			'edit': ['urac', '/owner/admin/group/edit','post'],
			'delete': ['urac', '/owner/admin/group/delete','delete'],
			'addUsers': ['urac', '/owner/admin/group/addUsers','post']
		},
		'adminToken': {
			'list': ['urac', '/owner/admin/tokens/list','get'],
			'delete': ['urac', '/owner/admin/tokens/delete','delete']
		}
	},
	
	users: {
		grid: {
			recordsPerPageArray: [10, 50, 100],
			'columns': [
				{'label': translation.username[LANG], 'field': 'username'},
				{'label': translation.firstName[LANG], 'field': 'firstName'},
				{'label': translation.lastName[LANG], 'field': 'lastName'},
				{'label': translation.email[LANG], 'field': 'email'},
				{'label': translation.status[LANG], 'field': 'status'},
				{'label': translation.groups[LANG], 'field': 'grpsArr'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': '',
			'defaultLimit': 50
		},
		
		form: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'username',
					'label': translation.username[LANG],
					'type': 'text',
					'placeholder': translation.enterUsername[LANG],
					'value': '',
					'tooltip': translation.usernamesToolTip[LANG],
					'required': true
				},
				{
					'name': 'email',
					'label': translation.email[LANG],
					'type': 'email',
					'placeholder': translation.enterEmail[LANG],
					'value': '',
					'tooltip': translation.emailToolTip[LANG],
					'required': true
				},
				{
					'name': 'firstName',
					'label': translation.firstName[LANG],
					'type': 'text',
					'placeholder': translation.enterFirstName[LANG],
					'value': '',
					'tooltip': translation.enterFirstNameUser[LANG],
					'required': true
				},
				{
					'name': 'lastName',
					'label': translation.lastName[LANG],
					'type': 'text',
					'placeholder': translation.enterLastName[LANG],
					'value': '',
					'tooltip': translation.enterLastNameUser[LANG],
					'required': true
				}
			]
		}
	},
	groups: {
		grid: {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': translation.code[LANG], 'field': 'code'},
				{'label': translation.name[LANG], 'field': 'name'},
				{'label': translation.description[LANG], 'field': 'description'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': '',
			'defaultLimit': 10
		},
		form: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'code',
					'label': translation.code[LANG],
					'type': 'text',
					'placeholder': translation.formGroupCodePlaceholder[LANG],
					'value': '',
					'tooltip': translation.formGroupCodeTooltip[LANG],
					'required': true
				},
				{
					'name': 'name',
					'label': translation.name[LANG],
					'type': 'text',
					'placeholder': translation.formGroupNamePlaceHolder[LANG],
					'value': '',
					'tooltip': '',
					'required': true
				},
				{
					'name': 'description',
					'label': translation.description[LANG],
					'type': 'textarea',
					'rows': 2,
					'placeholder': translation.formGroupDescriptionPlaceholder[LANG],
					'value': '',
					'tooltip': '',
					'required': true
				}
			]
		},
		users: {
			'name': '',
			'label': '',
			'msgs': {},
			'actions': {},
			'entries': [
				{
					'name': 'users',
					'label': translation.users[LANG],
					'type': 'checkbox',
					'placeholder': '',
					'value': [],
					'tooltip': translation.formGroupUsersTooltip[LANG],
					'required': true
				}
			]
		}
	}
};


var tokensModuleDevConfig = {
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{'label': translation.tokensUserId[LANG], 'field': 'username'},
			{'label': translation.tokensToken[LANG], 'field': 'token'},
			{'label': translation.tokensExpires[LANG], 'field': 'expires', 'filter': 'prettyLocalDate'},
			{'label': translation.tokensStatus[LANG], 'field': 'status'},
			{'label': translation.tokensService[LANG], 'field': 'service'}
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	}
};