var servicesConfig = {
	form:{
		serviceAdd: {
			'entries': [
				{
					'name': 'name',
					'label': 'Service Name',
					'type': 'text',
					'value': '',
					'tooltip': 'Enter the Service name you want to create',
					'required': true
				},
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
				},
				{
					'name': "image",
					"label": "Service Image",
					"type": "text",
					"value": "",
					"required": true,
					"tooltip": "Provide the container image name for this service."
				}
			]
		},
		serviceEdit:{
			'entries': [
				{
					'name': 'name',
					'label': 'Service Name',
					'type': 'readonly',
					'value': '',
					'tooltip': 'Service Name',
					'required': true
				},
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
				},
				{
					'name': "image",
					"label": "Service Image",
					"type": "text",
					"value": "",
					"required": true,
					"tooltip": "Provide the container image name for this service."
				}
			]
		}
	},
	permissions:{
		'listServices': ['dashboard', '/services/list'],
		'update': ['dashboard', '/services/update']
	}
};