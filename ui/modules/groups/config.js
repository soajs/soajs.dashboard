"use strict";

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
		'defaultLimit': 5
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
				'placeholder': 'Enter Code...',
				'value': '',
				'tooltip': 'Usernames are alphanumeric and support _ character only',
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
				'type': 'text',
				'placeholder': 'Enter Last Name...',
				'value': '',
				'tooltip': 'Enter the Last Name of the User',
				'required': true
			}
		]
	}
};