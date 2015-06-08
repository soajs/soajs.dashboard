"use strict";
var cbConfig = {
	grid: {
		'active':{
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Name', 'field': 'name'},
				{'label': 'Version', 'field': 'v'},
				{'label': 'Author', 'field': 'author'},
				{'label': 'Created', 'field': 'ts', 'filter': 'fulldate'},
				{'label': 'Last Modified', 'field': 'modified', 'filter': 'fulldate'}
			],
			'defaultSortField': 'name',
			'defaultLimit': 10
		},
		'revisions':{
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Version', 'field': 'v'},
				{'label': 'Author', 'field': 'author'},
				{'label': 'Last Modified', 'field': 'modified', 'filter': "fulldate"}
			],
			'defaultSortField': 'v',
			'defaultSortASC': true,
			'defaultLimit': 5
		}
	},

	form: {
		'name': '',
		'label': '',
		'actions': {},
		'entries': []
	},

	permissions: {
		'listServices': ['dashboard', '/cb/list'],
		'addService': ['dashboard', '/cb/add'],
		'updateService': ['dashboard', '/cb/update'],
		'getService': ['dashboard', '/cb/get'],
		'servicesRevisions': ['dashboard', '/cb/listRevisions']
	}
};