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
			{'label': 'Groups', 'field': 'grpsArr'}
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
				'label': 'Code',
				'type': 'text',
				'placeholder': 'Enter the Code of the Group',
				'value': '',
				'tooltip': 'Group codes are alphanumeric. Maximum length 20 characters',
				'required': true
			},
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'placeholder': 'Enter  Name...',
				'value': '',
				'tooltip': 'Enter the Name of the group',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'textarea',
				'rows': 2,
				'placeholder': 'Enter Last Name...',
				'value': '',
				'tooltip': 'Enter the Description of the Group',
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
				'placeholder': 'Add users',
				'value': [],
				'tooltip': 'Check to add user to group',
				'required': true
			}
		]
	}
};