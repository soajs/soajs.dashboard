var environmentConfig = {
	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		columns: [
			{label: 'Code', field: 'code'},
			{label: 'Description', field: 'description'},
			{label: 'IPs', field: 'ips'}
		],
		leftActions: [],
		topActions: [],
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
				'placeholder': 'DEV...',
				'value': '',
				'tooltip': 'Enter Environment Code; maximum 5 characters.',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'textarea',
				'rows': 10,
				'placeholder': 'Development Environment, used by developers and does not reach production server...',
				'value': '',
				'tooltip': 'Enter a description explaining the usage of this environment',
				'required': false
			},
			{
				'name': 'ips',
				'label': 'IP(s)',
				'type': 'textarea',
				'rows': 6,
				'placeholder': '127.0.0.1,192.168.0.1,...',
				'value': '',
				'tooltip': 'Enter IP Address(es); separate them using a comma.',
				'required': true
			}
		]
	}
};