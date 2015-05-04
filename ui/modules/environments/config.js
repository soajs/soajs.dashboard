var environmentConfig = {
	form: {
		'environment': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [

			]
		},
		database: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'name',
					'label': 'Database Name',
					'type': 'text',
					'placeholder': 'myDatabase...',
					'value': '',
					'tooltip': 'Enter Environment Database Name.',
					'required': true
				},
				{
					'name': 'cluster',
					'label': 'Cluster Name',
					'type': 'text',
					'placeholder': 'cluster 1...',
					'value': '',
					'tooltip': 'Enter the cluster name',
					'required': true
				},
				{
					'name': 'tenantSpecific',
					'label': 'Tenant Specific',
					'type': 'radio',
					'value': [{'v': 'false', 'selected': true}, {'v': 'true'}],
					'required': false
				}
			]
		},
		session: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'name',
					'label': 'Database Name',
					'type': 'text',
					'placeholder': 'myDatabase...',
					'value': '',
					'tooltip': 'Enter Environment Database Name.',
					'required': true
				},
				{
					'name': 'cluster',
					'label': 'Cluster Name',
					'type': 'text',
					'placeholder': 'cluster 1...',
					'value': '',
					'tooltip': 'Enter the cluster name',
					'required': true
				},
				{
					'name': 'collection',
					'label': 'Session Database Collection',
					'type': 'text',
					'placeholder': "session...",
					'value': '',
					'tooltip': 'Provide the Session Database Collection Name',
					'required': true
				},
				{
					'name': 'stringify',
					'label': 'Stringified',
					'type': 'radio',
					'value': [{'v': 'false', 'selected': true}, {'v': 'true'}],
					'required': true
				},
				{
					'name': 'expireAfter',
					'label': 'Expires After',
					'type': 'text',
					'tooltip': 'Enter the number of hours before the session expires',
					'value': '',
					'placeholder': '300...',
					'required': true
				},
				{
					'name': 'store',
					'label': 'Store',
					'type': 'textarea',
					'rows': 5,
					'placeholder': '{}',
					'value': '',
					'tooltip': 'Provide the Session Database Store',
					'required': true
				}
			]
		},
		cluster: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'name',
					'label': 'Cluster Name',
					'type': 'text',
					'placeholder': 'cluster1...',
					'value': '',
					'tooltip': 'Enter Environment Cluster Name.',
					'required': true
				},
				{
					'name': 'servers',
					'label': 'Servers List',
					'type': 'textarea',
					'rows': 2,
					'placeholder': '127.0.0.1:4000, 127.0.0.1:5000 ...',
					'value': '',
					'tooltip': 'Enter the list of servers host:port seperated by a comma',
					'required': true
				},
				{
					'name': 'credentials',
					'label': 'Credentials',
					'type': 'textarea',
					'rows': 4,
					'placeholder': JSON.stringify({
						"username": "admin",
						"password": "password"
					}, null, "\t"),
					'value': '',
					'tooltip': 'Enter the Credentials of the cluster',
					'required': false
				},
				{
					'name': 'urlParam',
					'label': 'URL Parameters',
					'type': 'textarea',
					'rows': 7,
					'placeholder': JSON.stringify({
						"connectTimeoutMS": 0,
						"socketTimeoutMS": 0,
						"maxPoolSize": 5,
						"wtimeoutMS": 0,
						"slaveOk": true
					}, null, "\t"),
					'value': '',
					'tooltip': 'Enter the URL Parameters of the cluster',
					'required': true
				},
				{
					'name': 'extraParam',
					'label': 'Extra Parameters',
					'type': 'textarea',
					'rows': 8,
					'placeholder': JSON.stringify({
						"db": {
							"native_parser": true
						},
						"server": {
							"auto_reconnect": true
						}
					}, null, "\t"),
					'value': '',
					'tooltip': 'Enter the Extra Parameters of the cluster',
					'required': true
				}
			]
		}
	}
};