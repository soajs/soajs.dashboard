var tenantConfig = {
	'grid': {
		'tenant': {
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
		'applications': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Product', 'field': 'product'},
				{'label': 'Package', 'field': 'package'},
				{'label': 'Description', 'field': 'description'},
				{'label': 'TTL ( hours )', 'field': '_TTL', filter: "TTL"}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'product',
			'defaultLimit': 5
		},
		'extKeys': {
			search: false,
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'External Key', 'field': 'extKey', filter: 'trimmed'},
				{'label': 'Expiry Date', 'field': 'expDate', filter: 'date'}
				//{'label': 'Geo', 'field': 'geo', filter: 'json'},
				//{'label': 'Device', 'field': 'device', filter: 'json'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'expDate',
			'defaultLimit': 5
		},
		'usersOauth': {
			search: false,
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'User Id', 'field': 'userId' }
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': '',
			'defaultLimit': 5
		}
	},
	'form': {
		'tenant': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'code',
					'label': 'Code',
					'type': 'text',
					'placeholder': 'TEST...',
					'value': '',
					'tooltip': 'Enter Tenant Code; maximum 4 characters.',
					'required': true
				},
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'placeholder': 'Test Tenant...',
					'value': '',
					'tooltip': 'Enter Tenant Name.',
					'required': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'type': 'textarea',
					'rows': 5,
					'placeholder': 'Testing Tenant, used by developers and does not reach production server...',
					'value': '',
					'tooltip': 'Enter a description explaining the usage of this tenant',
					'required': false
				}
			]
		},
		'oauth': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'secret',
					'label': 'Secret',
					'type': 'text',
					'placeholder': 'SECRET...',
					'value': '',
					'tooltip': 'Enter Tenant oAuth Secret.',
					'required': true
				},
				{
					'name': 'redirectURI',
					'label': 'Redirect URI',
					'type': 'url',
					'placeholder': 'redirectURI...',
					'value': '',
					'tooltip': 'Enter Tenant oAuth redirectURI.',
					'required': true
				}
			]
		},
		'oauthUser': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'userId',
					'label': 'user Id',
					'type': 'text',
					'placeholder': '..',
					'value': '',
					'tooltip': 'Enter the user Id.',
					'required': true
				},
				{
					'name': 'password',
					'label': 'password',
					'type': 'text',
					'placeholder': 'password...',
					'value': '',
					'tooltip': 'Enter oAuth user password.',
					'required': true
				}
			]
		},
		'application': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'product',
					'label': 'Product',
					'type': 'text',
					'placeholder': 'Enter the product code from productization section...',
					'value': '',
					'tooltip': 'Enter Product Code; maximum 5 characters.',
					'required': true
				},
				{
					'name': 'package',
					'label': 'Package',
					'type': 'text',
					'placeholder': 'Enter the package code from productization section...',
					'value': '',
					'tooltip': 'Enter Package Code; maximum 5 characters.',
					'required': true
				},
				{
					'name': 'description',
					'label': 'Description',
					'type': 'textarea',
					'rows': 5,
					'placeholder': 'Testing Application, used by developers and does not reach production server...',
					'value': '',
					'tooltip': 'Enter a description explaining the usage of this application',
					'required': false
				},
				{
					'name': 'acl',
					'label': 'Access Level',
					'type': 'textarea',
					'rows': 10,
					'placeholder': {"urac": {"access": false, "apis": {"/account/changeEmail": {"access": true}}}},
					'value': '',
					'tooltip': 'Enter the Access Level configuration in this box as a JSON format Object.',
					'required': false
				},
				{
					'name': '_TTL',
					'label': 'TTL',
					'type': 'radio',
					'value': [{'v': 6}, {'v': 12}, {'v': 24}, {'v': 48}],
					'tooltip': 'Pick a time to live value for this package.'
				}
			]
		},
		'keyConfig':{
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'envCode',
					'label': 'Environment Code',
					'type': 'text',
					'value': '',
					'placeholder': 'DEV...',
					'tooltip': 'Enter the environment code for the key configuration.',
					'required': true
				},
				{
					'name': 'config',
					'label': 'Configuration',
					'type': 'textarea',
					'rows': 10,
					'placeholder': "",
					'value': '',
					'tooltip': 'Enter the application key configuration.',
					'required': true
				}
			]
		},
		'extKey': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'expDate',
					'label': 'Exipry Date',
					'type': 'date-picker',
					'value': '',
					'tooltip': 'Pick the Expiry Date of the external key.',
					'min': new Date(),
					'required': true
				},
				{
					'name': 'device',
					'label': 'Device',
					'type': 'textarea',
					'rows': 5,
					'placeholder': "",
					'value': '',
					'tooltip': 'Specify the Device Security for the external key.',
					'required': false
				},
				{
					'name': 'geo',
					'label': 'GEO',
					'type': 'textarea',
					'rows': 5,
					'placeholder': "",
					'value': '',
					'tooltip': 'Specify the GEO Security for the external key.',
					'required': false
				}
			]
		}
	}
};