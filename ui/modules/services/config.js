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
					'tooltip': '',
					'required': true
				},
				{
					'name': 'requestTimeoutRenewal',
					'label': 'Request Timeout Renewal',
					'type': 'number',
					'placeholder': '5',
					'value': '',
					'tooltip': '',
					'required': true
				},
				{
					'name': 'extKeyRequired',
					'label': 'External Key Required',
					'type': 'radio',
					'value': [{'v': false}, {'v': true}],
					'tooltip': '',
					'required': true
				}
			]
		}
	},
	permissions:{
		'listServices': ['dashboard', '/services/list']
	}
};