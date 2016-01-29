"use strict";
var environmentsConfig = {
	form: {
		template: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'code',
					'label': 'Environment Code',
					'type': 'select',
					'value': [
						{'v': 'DEV', 'l': 'DEV'},
						{'v': 'CAT', 'l': 'CAT'},
						{'v': 'STG', 'l': 'STG'},
						{'v': 'PROD', 'l': 'PROD'}
					],
					'required': true
				},
				{
					'name': 'description',
					'label': 'Environment Description',
					'type': 'textarea',
					'rows': '3',
					'placeholder': 'My Environment Description...',
					'value': '',
					'required': true
				},
				{
					'name': 'domain',
					'label': 'Environment Domain',
					'type': 'text',
					'placeholder': 'mydomain.com',
					'value': '',
					'required': true
				},
				{
					'name': 'port',
					'label': 'Environment Gateway Port',
					'type': 'select',
					'value': [
						{'v': 80, 'l': '80', 'selected': true},
						{'v': 8080, 'l': '8080'},
						{'v': 8081, 'l': '8081'},
						{'v': 8082, 'l': '8082'},
						{'v': 8083, 'l': '8083'}
					],
					'required': true
				},
				{
					'name': 'profile',
					'label': 'Profile to Use',
					'type': 'select',
					'value': [
						{'v': 'single', 'l': 'single', 'selected': true},
						{'v': 'replica3', 'l': 'replica3'},
						{'v': 'replica5', 'l': 'replica5'}
					],
					'required': false
				},
				{
					'name': 'platformDriver',
					'label': 'Platform Driver',
					'type': 'select',
					'value': [
						{'v': 'socket', 'l': 'Socket', 'selected': true},
						{'v': 'boot2docker', 'l': 'Boot2docker'},
						{'v': 'joyent', 'l': 'Joyent'},
						{'v': 'rackspace', 'l': 'Rackspace'}
					],
					'required': false
				},
				{
					'name': 'tKeyPass',
					'label': 'Tenant Key Security Password',
					'type': 'text',
					'value': '',
					'placeholder': 'My Tenant Key AES256 Password...',
					'required': false
				},
				{
					'name': 'sessionCookiePass',
					'label': 'Session & Cookie encryption Password',
					'type': 'text',
					'value': '',
					'placeholder': "My Password, don't tell anyone...",
					'required': false
				}
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
		},
		host: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'number',
					'label': 'Host(s) Number',
					'type': 'number',
					'placeholder': '1',
					'value': 1,
					'tooltip': 'Enter How Many Host(s)',
					'fieldMsg': 'Enter How Many Host(s) you would like to add for this service.',
					'required': true
				},
				{
					'name': 'variables',
					"label": "Environment Variables",
					"type": "textarea",
					"required": false,
					"tooltip": "Provide Optional Environment Variables separated by a comma",
					"fieldMsg": "ENV_VAR1=val1,ENV_VAR2=val2,..."
				},
				{
					"name": "defaultENVVAR",
					"type": "html",
					"value": "<p>Default Environment Variables:<br /><ul><li>SOAJS_SRV_AUTOREGISTER=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=%envName%</li><li>SOAJS_PROFILE=%profilePathToUse%</li></ul></p>"
				}
			]
		},
		"deploy": {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'controllers',
					'label': 'Controller(s)',
					'type': 'number',
					'placeholder': '1',
					'value': '',
					'tooltip': 'Choose how many controllers to deploy',
					'fieldMsg': 'Choose how many controllers you want to deploy',
					'required': true
				},
				{
					'name': 'variables',
					"label": "Environment Variables",
					"type": "textarea",
					"required": false,
					"tooltip": "Provide Optional Environment Variables separated by a comma",
					"fieldMsg": "ENV_VAR1=val1,ENV_VAR2=val2,..."
				},
				{
					"name": "defaultENVVAR",
					"type": "html",
					"value": "<p>Default Environment Variables:<br /><ul><li>SOAJS_SRV_AUTOREGISTER=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=%envName%</li><li>SOAJS_PROFILE=%profilePathToUse%</li></ul></p>"
				}
			]
		}
	},
	permissions: {
		"listEnvironments": ['dashboard', '/environment/list'],
		"addEnvironment": ['dashboard', '/environment/add'],
		"deleteEnvironment": ['dashboard', '/environment/delete'],
		"editEnvironment": ['dashboard', '/environment/update'],
		"listHosts": ['dashboard', '/hosts/list'],
		"dbs": {
			"list": ['dashboard', '/environment/dbs/list'],
			"add": ['dashboard', '/environment/dbs/add'],
			"delete": ['dashboard', '/environment/dbs/delete'],
			"update": ['dashboard', '/environment/dbs/update'],
			"updatePrefix": ['dashboard', '/environment/dbs/updatePrefix']
		},
		"clusters": {
			"list": ['dashboard', '/environment/clusters/list'],
			"add": ['dashboard', '/environment/clusters/add'],
			"delete": ['dashboard', '/environment/clusters/delete'],
			"update": ['dashboard', '/environment/clusters/update']
		}
	}
};