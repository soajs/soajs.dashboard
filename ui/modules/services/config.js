var servicesConfig = {
	form:{
		serviceEdit:{
			'entries': [
				{
					'name': 'requestTimeout',
					'label': 'Request Timeout',
					'type': 'number',
					'placeholder': '30',
					'value': '',
					'tooltip': 'Maximum timeout value for a request to this service',
					'required': true
				},
				{
					'name': 'requestTimeoutRenewal',
					'label': 'Request Timeout Renewal',
					'type': 'number',
					'placeholder': '5',
					'value': '',
					'tooltip': 'In case of a timeout, set the number of trial attempts',
					'required': true
				},
				{
					'name': 'extKeyRequired',
					'label': 'External Key Required',
					'type': 'radio',
					'value': [{'v': false}, {'v': true}],
					'tooltip': 'If this service requires an external key; ie if it is multi-tenant',
					'required': true
				}
			]
		}
	},
	permissions:{
		'listServices': ['dashboard', '/services/list'],
		'update': ['dashboard', '/services/update']
	}
};