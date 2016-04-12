"use strict";
var configDashbrd = {
	'grid': {
		'tenants': {
			search: false,
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Code', 'field': 'code'},
				{'label': 'Name', 'field': 'name'},
				{'label': 'Description', 'field': 'description'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'code',
			'defaultLimit': 5
		},
		'environments': {
			search: false,
			recordsPerPageArray: [5, 10, 50, 100],
			columns: [
				{label: 'Code', field: 'code'},
				{label: 'Description', field: 'description'}
			],
			leftActions: [],
			topActions: [],
			'defaultSortField': '',
			'defaultLimit': 5

		},
		'products': {
			search: false,
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Code', 'field': 'code'},
				{'label': 'Name', 'field': 'name'},
				{'label': 'Description', 'field': 'description'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'code',
			'defaultLimit': 5

		}
	},
	'form': {},
	'permissions': {
		'environment': ['dashboard', '/environment/list'],
		'tenant': ['dashboard', '/tenant/list'],
		'product': ['dashboard', '/product/list'],
		'services': ['dashboard', '/services/list']
	}
};