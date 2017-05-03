var tenantConfig = {
	'grid': {
		'tenant': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': translation.code[LANG], 'field': 'code'},
				{'label': translation.name[LANG], 'field': 'name'},
				{'label': translation.description[LANG], 'field': 'description'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': 'code',
			'defaultLimit': 5
		},
		'applications': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': translation.product[LANG], 'field': 'product'},
				{'label': translation.package[LANG], 'field': 'package'},
				{'label': translation.description[LANG], 'field': 'description'},
				{'label': 'TTL ( ' + translation.hours[LANG] + ' )', 'field': '_TTL', filter: "TTL"}
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
				{'label': translation.externalKey[LANG], 'field': 'extKey', filter: 'trimmed'},
				{'label': translation.expiryDate[LANG], 'field': 'expDate', filter: 'date'}
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
				{'label': translation.userID[LANG], 'field': 'userId'}
			],
			'leftActions': [],
			'topActions': [],
			'defaultSortField': '',
			'defaultLimit': 5
		},
		'keys': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': translation.code[LANG], 'field': 'code'},
				{'label': translation.key[LANG], 'field': 'key'}
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
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'code',
					'label': translation.code[LANG],
					'type': 'readonly',
					'placeholder': translation.formCodePlaceholder[LANG],
					'value': '',
					'tooltip': translation.formTntCodeToolTip[LANG],
					'required': true
				},
				{
					'name': 'type',
					'label': translation.role[LANG],
					'type': 'select',
					'value': [
						/*{
						 'v': 'admin',
						 'l': 'Administration Tenant'
						 },*/
						{
							'v': 'product',
							'l': translation.productTenant[LANG]
						},
						{
							'v': 'client',
							'l': translation.clientTenant[LANG]
						}
					],
					'tooltip': translation.formTntTypeToolTip[LANG],
					'required': true,
					'fieldMsg': translation.formTntTypeFieldMsg[LANG]
				},
				{
					'name': 'name',
					'label': translation.name[LANG],
					'type': 'text',
					'placeholder': translation.formTntNamePlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formTentNameToolTip[LANG],
					'required': true
				},
				{
					'name': 'description',
					'label': translation.description[LANG],
					'type': 'textarea',
					'rows': 5,
					'placeholder': translation.formTentDescriptionPlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formDescriptionTenantToolTip[LANG],
					'required': false
				},
				{
					'name': 'tag',
					'label': translation.tag[LANG],
					'type': 'text',
					'placeholder': translation.formTagPlaceHolder[LANG],
					'tooltip': translation.formTagToolTip[LANG],
					'required': false,
					'fieldMsg': translation.formTagFieldMsg[LANG]
				}
				/*,
				 {
				 'name': 'secret',
				 'label': translation.oAuthSecret[LANG],
				 'type': 'text',
				 'placeholder': translation.formSecretPlaceHolder[LANG],
				 'value': '',
				 'tooltip': translation.formSecretToolTip[LANG],
				 'required': false
				 }
				 ,
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
		'tenantAdd': {
			'name': 'addTenant',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'type',
					'label': translation.role[LANG],
					'type': 'select',
					'value': [
						/*{
						 'v': 'admin',
						 'l': 'Administration Tenant'
						 },*/
						{
							'v': 'product',
							'l': translation.productTenant[LANG]
						},
						{
							'v': 'client',
							'l': translation.clientTenant[LANG],
							'selected': true
						}
					],
					'tooltip': translation.formTntTypeToolTip[LANG],
					'required': true,
					'fieldMsg': translation.formTntTypeFieldMsg[LANG]
				},
				{
					'name': 'name',
					'label': 'Name',
					'type': 'text',
					'placeholder': translation.formTntNamePlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formTentNameToolTip[LANG],
					'required': true
				},
				{
					'name': 'email',
					'label': 'Email',
					'type': 'email',
					'placeholder': translation.formEmailPlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formEmailToolTip[LANG],
					'required': true
				},
				{
					'name': 'description',
					'label': translation.description[LANG],
					'type': 'textarea',
					'rows': 5,
					'placeholder': translation.formTentDescriptionPlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formDescriptionTenantToolTip[LANG],
					'required': false
				},
				{
					'name': 'package',
					'label': translation.dashboardPackage[LANG],
					'type': 'select',
					'tooltip': translation.formDashboardPackagePlaceHolder[LANG],
					'required': false,
					'fieldMsg': translation.formDashboardPackageToolTip[LANG]
				},
				{
					'name': 'tag',
					'label': translation.tag[LANG],
					'type': 'text',
					'placeholder': translation.formTagPlaceHolder[LANG],
					'tooltip': translation.formTagToolTip[LANG],
					'required': false,
					'fieldMsg': translation.formTagFieldMsg[LANG]
				}
			]
		},
		'oauthUserUpdate': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'userId',
					'label': translation.userId[LANG],
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
					'label': translation.userId[LANG],
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
		'application': {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'product',
					'label': translation.product[LANG],
					'type': 'text',
					'placeholder': translation.formpProductPlaceHolder[LANG],
					'value': '',
					'tooltip': '',
					'required': false
				},
				{
					'name': 'package',
					'label': translation.productPackage[LANG],
					'type': 'text',
					'placeholder': translation.formProductPackagePlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formProductPackageToolTip[LANG],
					'required': true
				},
				{
					'name': 'description',
					'label': translation.description[LANG],
					'type': 'textarea',
					'rows': 5,
					'placeholder': translation.formProductPackageDescriptionPlaceHolder[LANG],
					'value': '',
					'tooltip': translation.formProductPackageDescriptionTooltip[LANG],
					'required': false
				},
				{
					'name': '_TTL',
					'label': 'TTL',
					'type': 'select',
					'value': [{'v': 6, 'l': '6 ' + translation.hours[LANG]}, {
						'v': 12,
						'l': '12 ' + translation.hours[LANG]
					}, {'v': 24, 'l': '24 ' + translation.hours[LANG]},
						{'v': 120, 'l': '5 ' + translation.days[LANG]}, {
							'v': 144,
							'l': '6 ' + translation.days[LANG]
						}, {'v': 168, 'l': '7 ' + translation.days[LANG]}],
					'tooltip': translation.formTTLToolTip[LANG]
				}
			]
		},
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
					'tooltip': 'Enter the environment code for the key configuration.',
					'required': true
				},
				{
					'name': 'config',
					'label': translation.configuration[LANG],
					'type': 'jsoneditor',
					'options': {
						'mode': 'code',
						'availableModes': [{'v': 'code', 'l': 'Code View'}, {
							'v': 'tree',
							'l': 'Tree View'
						}, {'v': 'form', 'l': 'Form View'}]
					},
					'height': '300px',
					"value": {},
					'required': true,
					'tooltip': translation.formConfigToolTip[LANG]
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
						'availableModes': [{'v': 'code', 'l': 'Code View'}, {
							'v': 'tree',
							'l': 'Tree View'
						}, {'v': 'form', 'l': 'Form View'}]
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
						'availableModes': [{'v': 'code', 'l': 'Code View'}, {
							'v': 'tree',
							'l': 'Tree View'
						}, {'v': 'form', 'l': 'Form View'}]
					},
					'height': '200px',
					"value": {},
					'required': false,
					'tooltip': translation.formGEOToolTip[LANG],
				}
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
			'add': ['dashboard', '/tenant/add', 'post'],
			'delete': ['dashboard', '/tenant/delete', 'delete'],
			'update': ['dashboard', '/tenant/update', 'put'],
			'list': ['dashboard', '/tenant/list', 'get'],
			'oauth': {
				'list': ['dashboard', '/tenant/oauth/list', 'get'],
				'update': ['dashboard', '/tenant/oauth/update', 'put'],
				'delete': ['dashboard', '/tenant/oauth/delete', 'delete'],
				'users': {
					'list': ['dashboard', '/tenant/oauth/users/list', 'get'],
					'add': ['dashboard', '/tenant/oauth/users/add', 'post'],
					'update': ['dashboard', '/tenant/oauth/users/update', 'put'],
					'delete': ['dashboard', '/tenant/oauth/users/delete', 'delete']
				}
			},
			'application': {
				'add': ['dashboard', '/tenant/application/add', 'post'],
				'delete': ['dashboard', '/tenant/application/delete', 'delete'],
				'update': ['dashboard', '/tenant/application/update', 'put'],
				'list': ['dashboard', '/tenant/application/list', 'get']
			},
			'appKeys': {
				'list': ['dashboard', '/tenant/application/key/list', 'get'],
				'add': ['dashboard', '/tenant/application/key/add', 'post'],
				'delete': ['dashboard', '/tenant/application/key/delete', 'delete'],
				'listConfig': ['dashboard', '/tenant/application/key/config/list', 'get'],
				'updateConfig': ['dashboard', '/tenant/application/key/config/update', 'put']
			},
			'externalKeys': {
				'add': ['dashboard', '/tenant/application/key/ext/add', 'post'],
				'list': ['dashboard', '/tenant/application/key/ext/list', 'get'],
				'delete': ['dashboard', '/tenant/application/key/ext/delete', 'post'],
				'update': ['dashboard', '/tenant/application/key/ext/update', 'put']
			}
		},
		'db': {
			'listKeys': ['dashboard', "/tenant/db/keys/list", 'get']
		}
	}
	
};
