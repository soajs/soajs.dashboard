"use strict";

var membersConfig = {
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
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
		'defaultLimit': 10
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
				'placeholder': 'Enter Username...',
				'value': '',
				'tooltip': 'Usernames are alphanumeric and support _ & - characters only',
				'required': true
			},
			{
				'name': 'email',
				'label': translation.email[LANG],
				'type': 'email',
				'placeholder': 'Enter Email...',
				'value': '',
				'tooltip': 'myemail@example.domain',
				'required': true
			},
			{
				'name': 'firstName',
				'label': translation.firstName[LANG],
				'type': 'text',
				'placeholder': 'Enter First Name...',
				'value': '',
				'tooltip': 'Enter the First Name of the User',
				'required': true
			},
			{
				'name': 'lastName',
				'label': translation.lastName[LANG],
				'type': 'text',
				'placeholder': 'Enter Last Name...',
				'value': '',
				'tooltip': 'Enter the Last Name of the User',
				'required': true
			}
		]
	},

	permissions: {
		"adminAll": ['urac', '/admin/all'],
		'adminUser': {
			'list': ['urac', '/admin/listUsers'],
			'changeStatusAccess': ['urac', '/admin/changeStatusAccess'],
			'editUser': ['urac', '/admin/editUser'],
			'editUserAcl': ['urac', '/admin/editUser'],
			'addUser': ['urac', '/admin/addUser']
		},
		'adminGroup': {
			'list': ['urac', '/admin/group/list'],
			'add': ['urac', '/admin/group/add'],
			'edit': ['urac', '/admin/group/edit'],
			'delete': ['urac', '/admin/group/delete'],
			'addUsers': ['urac', '/admin/group/addUsers']
		}
	}
};

var groupsConfig = {
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{'label': 'Code', 'field': 'code'},
			{'label': 'Name', 'field': 'name'},
			{'label': 'Description', 'field': 'description'}
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
				'placeholder': 'Enter the Code of the group',
				'value': '',
				'tooltip': 'Group codes are alphanumeric. Maximum length 20 characters',
				'required': true
			},
			{
				'name': 'name',
				'label': translation.name[LANG],
				'type': 'text',
				'placeholder': 'Enter teh Name of the group',
				'value': '',
				'tooltip': '',
				'required': true
			},
			{
				'name': 'description',
				'label': translation.description[LANG],
				'type': 'textarea',
				'rows': 2,
				'placeholder': 'Enter the Description of the Group',
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
				'label': 'Users',
				'type': 'checkbox',
				'placeholder': '',
				'value': [],
				'tooltip': 'Check to add user to group',
				'required': true
			}
		]
	}
};