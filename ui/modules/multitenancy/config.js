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
		},
        'keys': {
            recordsPerPageArray: [5, 10, 50, 100],
            'columns': [
                {'label': 'Code', 'field': 'code'},
                {'label': 'Key', 'field': 'key'}
            ],
            'leftActions': [],
            'topActions': [],
            'defaultSortField': 'code',
            'defaultLimit': 5
        }
	},
	'form': {
		'tenantEdit': {
			'name': 'editTenant',
			'label': 'Edit Basic Tenant Information',
			'actions': {},
			'entries': [
				{
					'name': 'code',
					'label': 'Code',
					'type': 'readonly',
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
				},
				{
					'name': 'secret',
					'label': 'oAuth Secret',
					'type': 'text',
					'placeholder': 'SECRET...',
					'value': '',
					'tooltip': 'Enter Tenant oAuth Secret.',
					'required': false
				}
				/*,
				{
					'name': 'redirectURI',
					'label': 'oAuth Redirect URI',
					'type': 'url',
					'placeholder': 'redirectURI...',
					'value': '',
					'tooltip': 'Enter Tenant oAuth redirectURI.',
					'required': false
				}
				*/
			]
		},
		'tenantAdd': {
			'name': 'addTenant',
			'label': 'Add Tenant',
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
		'oauthUserUpdate': {
			'name': 'update_oAuthUser',
			'label': 'update_oAuthUser',
			'actions': {},
			'entries': [
				{
					'name': 'userId',
					'label': 'user Id',
					'type': 'text',
					'placeholder': 'oauthUser ..',
					'value': '',
					'tooltip': 'Enter the user Id.',
					'required': true
				},
				{
					'name': 'password',
					'label': 'Password',
					'type': 'password',
					'placeholder': 'Enter a new password...',
					'value': '',
					'tooltip': 'Keep it empty to maintain the old password.',
					'required': false
				},
				{
					'name': 'confirmPassword',
					'label': 'Confirm Password',
					'type': 'password',
					'placeholder': 'password...',
					'value': '',
					'tooltip': 'Confirm oAuth user password.',
					'required': false
				}
			]
		},
		'oauthUser': {
			'name': 'add_oauthUser',
			'label': 'add_oauthUser',
			'actions': {},
			'entries': [
				{
					'name': 'userId',
					'label': 'User Id',
					'type': 'text',
					'placeholder': 'oauthUser ..',
					'value': '',
					'tooltip': 'Enter the user Id.',
					'required': true
				},
				{
					'name': 'user_password',
					'label': 'Password',
					'type': 'password',
					'placeholder': 'password...',
					'value': '',
					'tooltip': 'Enter oAuth user password.',
					'required': true
				},
				{
					'name': 'confirmPassword',
					'label': 'Confirm Password',
					'type': 'password',
					'placeholder': 'password...',
					'value': '',
					'tooltip': 'Confirm oAuth user password.',
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
					'tooltip': '',
					'required': false
				},
				{
					'name': 'package',
					'label': 'Product Package',
					'type': 'text',
					'placeholder': 'Enter the package code from productization section...',
					'value': '',
					'tooltip': 'Choose Product Package Code.',
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
					'name': '_TTL',
					'label': 'TTL',
					'type': 'select',
					'value': [{'v': 6, 'l': '6 hours'}, {'v': 12, 'l': '12 hours'}, {'v': 24, 'l': '24 hours'},
					          {'v': 48, 'l': '2 days'}, {'v': 72, 'l':'3 days'}, {'v': 96, 'l':'4 days'}, 
					          {'v': 120, 'l':'5 days'}, {'v': 144, 'l':'6 days'}, {'v': 168, 'l':'7 days'}],
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
					'tooltip': 'Pick the Expiry Date of the external key. If empty, the key will not expire',
					'required': false
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
		},
        'dbKey': {
            'name': '',
            'label': '',
            'actions': {},
            'entries': [
                {
                    'name': 'code',
                    'label': 'Tenant Code',
                    'type': 'text',
                    'value': '',
                    'tooltip': 'Enter the tenant code.',
                    'required': true
                },
                {
                    'name': 'key',
                    'label': 'Tenant Ext Key',
                    'type': 'text',
                    'value': '',
                    'tooltip': 'Enter the tenant ext key.',
                    'required': true
                }
            ]
        }
	},
	'permissions':{
		'product':{
			'list' : ['dashboard', '/product/list']
		},
		'environment':{
			'list': ['dashboard', '/environment/list']
		},
		'tenant':{
			'add' : ['dashboard', '/tenant/add'],
			'delete' : ['dashboard', '/tenant/delete'],
			'update' : ['dashboard', '/tenant/update'],
			'list' : ['dashboard', '/tenant/list'],
			'oauth':{
				'list' : ['dashboard', '/tenant/oauth/list'],
				'update' : ['dashboard', '/tenant/oauth/update'],
				'delete' : ['dashboard', '/tenant/oauth/delete'],
				'users':{
					'list' : ['dashboard', '/tenant/oauth/users/list'],
					'add' : ['dashboard', '/tenant/oauth/users/add'],
					'update' : ['dashboard', '/tenant/oauth/users/update'],
					'delete' : ['dashboard', '/tenant/oauth/users/delete']
				}
			},
			'application':{
				'add' : ['dashboard', '/tenant/application/add'],
				'delete' : ['dashboard', '/tenant/application/delete'],
				'update' : ['dashboard', '/tenant/application/update'],
				'list' : ['dashboard', '/tenant/application/list']
			},
			'appKeys':{
				'list' : ['dashboard', '/tenant/application/key/list'],
				'add' : ['dashboard', '/tenant/application/key/add'],
				'delete' : ['dashboard', '/tenant/application/key/delete'],
				'listConfig' : ['dashboard', '/tenant/application/key/config/list'],
				'updateConfig' : ['dashboard', '/tenant/application/key/config/update']
			},
			'externalKeys':{
				'add' : ['dashboard', '/tenant/application/key/ext/add'],
				'list' : ['dashboard', '/tenant/application/key/ext/list'],
				'delete' : ['dashboard', '/tenant/application/key/ext/delete'],
				'update' : ['dashboard', '/tenant/application/key/ext/update']
			}
		},
        'db':{
            'listKeys': ['dashboard', "/tenant/db/keys/list"],
            'addKey': ['dashboard', "/tenant/db/keys/add"],
            'deleteKey': ['dashboard', "/tenant/db/keys/delete"]
        }
	}

};