var settingsConfig = {
	'form': {
		'updateOauth': {
			'name': 'updateOauth',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'secret',
					'label': translation.oAuthSecret[LANG],
					'placeholder': translation.formSecretPlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formSecretToolTip[LANG],
					'required': true
				},
				{
					'name': 'oauthType',
					'label': translation.oAuthType[LANG],
					'type': 'radio',
					'value': [
						{
							'v': 'urac',
							'l': 'Client to server authentication (URAC)'
						},
						{
							'v': 'miniurac',
							'l': 'Server to server authentication (miniURAC)'
						}
					],
					'required': true,
				},
			]
		},
		'oauthUserUpdate': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'userId',
					'label': translation.userID[LANG],
					'type': 'text',
					'placeholder': translation.formUserIdPlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formUserIdToolTip[LANG],
					'required': true
				},
				{
					'name': 'password',
					'label': translation.password[LANG],
					'type': 'password',
					'placeholder': translation.newPasswordPlaceholder[LANG],
					'value': '',
					'tooltip': translation.oAuthFrmPasswordTooltip[LANG],
					'required': false
				},
				{
					'name': 'confirmPassword',
					'label': translation.confirmPassword[LANG],
					'type': 'password',
					'placeholder': translation.confirmPasswordPlaceholder[LANG],
					'value': '',
					'tooltip': translation.oAuthConfirmPasswordTooltip[LANG],
					'required': false
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
					'label': translation.userID[LANG],
					'type': 'text',
					'placeholder': translation.formUserIdPlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formUserIdToolTip[LANG],
					'required': true
				},
				{
					'name': 'user_password',
					'label': translation.password[LANG],
					'type': 'password',
					'placeholder': translation.password[LANG],
					'value': '',
					'tooltip': translation.formOathPasswordTooltip[LANG],
					'required': true
				},
				{
					'name': 'confirmPassword',
					'label': translation.confirmPassword[LANG],
					'type': 'password',
					'placeholder': translation.confirmPasswordPlaceholder[LANG],
					'value': '',
					'tooltip': translation.oAuthConfirmPasswordTooltip[LANG],
					'required': true
				}
			]
		},
		//'application': {
		//	'name': '',
		//	'label': '',
		//	'actions': {},
		//	'entries': [
		//		{
		//			'name': 'product',
		//			'label': 'Product',
		//			'type': 'text',
		//			'placeholder': 'Enter the product code from productization section...',
		//			'value': '',
		//			'tooltip': '',
		//			'required': false
		//		},
		//		{
		//			'name': 'package',
		//			'label': 'Product Package',
		//			'type': 'text',
		//			'placeholder': 'Enter the package code from productization section...',
		//			'value': '',
		//			'tooltip': 'Choose Product Package Code.',
		//			'required': true
		//		},
		//		{
		//			'name': 'description',
		//			'label': 'Description',
		//			'type': 'textarea',
		//			'rows': 5,
		//			'placeholder': 'Testing Application, used by developers and does not reach production server...',
		//			'value': '',
		//			'tooltip': 'Enter a description explaining the usage of this application',
		//			'required': false
		//		},
		//		{
		//			'name': '_TTL',
		//			'label': 'TTL',
		//			'type': 'select',
		//			'value': [{'v': 6, 'l': '6 hours'}, {'v': 12, 'l': '12 hours'}, {'v': 24, 'l': '24 hours'},
		//				{'v': 48, 'l': '2 days'}, {'v': 72, 'l': '3 days'}, {'v': 96, 'l': '4 days'},
		//				{'v': 120, 'l': '5 days'}, {'v': 144, 'l': '6 days'}, {'v': 168, 'l': '7 days'}],
		//			'tooltip': 'Pick a time to live value for this package.'
		//		}
		//	]
		//},
		'keyConfig': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'envCode',
					'label': translation.envCode[LANG],
					'type': 'text',
					'value': '',
					'placeholder': 'DEV...',
					'tooltip': translation.formEnvCodeTooltip[LANG],
					'required': true
				},
				{
				    'name': 'config',
				    'label': translation.configuration[LANG],
				    'type': 'jsoneditor',
				    'options': {
				        'mode': 'code',
				        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
				    },
				    'height': '300px',
				    "value": {},
				    'required': true,
				    'tooltip': translation.formConfigToolTip[LANG],
				}
			]
		},
		'extKey': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'environment',
					'label': translation.environment[LANG],
					'type': 'select',
					'value': [],
					'tooltip': translation.selectEnvironment[LANG],
					'required': true
				},
				{
					'name': 'expDate',
					'label': translation.expiryDate[LANG],
					'type': 'date-picker',
					'value': '',
					'tooltip': translation.formExpDateTooltip[LANG],
					'required': false
				},
				{
				    'name': 'device',
				    'label': translation.device[LANG],
				    'type': 'jsoneditor',
				    'options': {
				        'mode': 'code',
				        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
				    },
				    'height': '200px',
				    "value": {},
				    'required': false,
				    'tooltip': translation.formDeviceTooltip[LANG],
				},
				{
				    'name': 'geo',
				    'label': 'GEO',
				    'type': 'jsoneditor',
				    'options': {
				        'mode': 'code',
				        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
				    },
				    'height': '200px',
				    "value": {},
				    'required': false,
				    'tooltip': translation.formGEOToolTip[LANG],
				},
			]
		}
	},
	'permissions': {
		'product': {
			'list': ['dashboard', '/product/list', 'get']
		},
		'environment': {
			'list': ['dashboard', '/environment/list', 'get']
		},
		'tenant': {
			'update': ['dashboard', '/settings/tenant/update', 'put'],
			'oauth': {
				'list': ['dashboard', '/settings/tenant/oauth/list', 'get'],
				'update': ['dashboard', '/settings/tenant/oauth/update', 'put'],
				'delete': ['dashboard', '/settings/tenant/oauth/delete', 'delete'],
				'users': {
					'list': ['dashboard', '/settings/tenant/oauth/users/list', 'get'],
					'add': ['dashboard', '/settings/tenant/oauth/users/add', 'post'],
					'update': ['dashboard', '/settings/tenant/oauth/users/update', 'put'],
					'delete': ['dashboard', '/settings/tenant/oauth/users/delete', 'delete']
				}
			},
			'application': {
				'list': ['dashboard', '/settings/tenant/application/list', 'get']
			},
			'appKeys': {
				'list': ['dashboard', '/settings/tenant/application/key/list', 'get'],
				'add': ['dashboard', '/settings/tenant/application/key/add', 'post'],
				'delete': ['dashboard', '/settings/tenant/application/key/delete', 'delete'],
				'listConfig': ['dashboard', '/settings/tenant/application/key/config/list', 'get'],
				'updateConfig': ['dashboard', '/settings/tenant/application/key/config/update', 'put']
			},
			'externalKeys': {
				'add': ['dashboard', '/settings/tenant/application/key/ext/add', 'post'],
				'list': ['dashboard', '/settings/tenant/application/key/ext/list', 'get'],
				'delete': ['dashboard', '/settings/tenant/application/key/ext/delete', 'post'],
				'update': ['dashboard', '/settings/tenant/application/key/ext/update', 'put']
			}
		}
	}
};
