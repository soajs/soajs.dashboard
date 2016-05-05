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
					'label': translation.envCode[LANG],
					'type': 'select',
					'value': [
						{'v': 'DEV', 'l': 'DEV'},
						{'v': 'QA', 'l': 'QA'},
						{'v': 'CAT', 'l': 'CAT'},
						{'v': 'STG', 'l': 'STG'},
						{'v': 'PROD', 'l': 'PROD'}
					],
					'required': true
				},
				{
					'name': 'description',
					'label': translation.environmentDescription[LANG],
					'type': 'textarea',
					'rows': '3',
					'placeholder': translation.myEnvDescription[LANG],
					'value': '',
					'required': true
				},
				{
					'name': 'domain',
					'label': translation.environmentDomain[LANG],
					'type': 'text',
					'placeholder': translation.myDomainCom[LANG],
					'value': '',
					'required': true
				},
				{
					'name': 'apiPrefix',
					'label': translation.apiPrefix[LANG],
					'type': 'text',
					'placeholder': 'api',
					'value': '',
					'required': false,
					'fieldMsg': translation.inCaseAPIPrefixNotSpecified[LANG]
				},
				{
					'name': 'sitePrefix',
					'label': translation.sitePrefix[LANG],
					'type': 'text',
					'placeholder': 'site',
					'value': '',
					'required': false,
					'fieldMsg': translation.inCaseSitePrefixNotSpecified[LANG]
				},
				{
					'name': 'port',
					'label': translation.environmentGatewayPort[LANG],
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
					'name': 'tKeyPass',
					'label': translation.tenantKeySecurityPassword[LANG],
					'type': 'text',
					'value': '',
					'placeholder': translation.myTenantKeyAES256Password[LANG],
					'required': true
				},
				{
					'name': 'sessionCookiePass',
					'label': translation.sessionCookieEncryptionPassword[LANG],
					'type': 'text',
					'value': '',
					'placeholder': translation.myPasswordDoNotTellAnyone[LANG],
					'required': true
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
					'label': translation.databaseName[LANG],
					'type': 'text',
					'placeholder': translation.myDatabase[LANG],
					'value': '',
					'tooltip': translation.enterEnvironmentDatabaseName[LANG],
					'required': true
				},
				{
					'name': 'cluster',
					'label': translation.clusterName[LANG],
					'type': 'text',
					'placeholder': translation.cluster1[LANG],
					'value': '',
					'tooltip': translation.enterTheClusterName[LANG],
					'required': true
				},
				{
					'name': 'tenantSpecific',
					'label': translation.tenantSpecific[LANG],
					'type': 'radio',
					'value': [{'v': false, 'selected': true}, {'v': true}],
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
					'label': translation.databaseName[LANG],
					'type': 'text',
					'placeholder': translation.myDatabase[LANG],
					'value': '',
					'tooltip': translation.enterEnvironmentDatabaseName[LANG],
					'required': true
				},
				{
					'name': 'cluster',
					'label': translation.clusterName[LANG],
					'type': 'text',
					'placeholder': translation.cluster1[LANG],
					'value': '',
					'tooltip': translation.enterTheClusterName[LANG],
					'required': true
				},
				{
					'name': 'collection',
					'label': translation.sessionDatabaseCollection[LANG],
					'type': 'text',
					'placeholder': translation.sessionDots[LANG],
					'value': '',
					'tooltip': translation.provideTheSessionDatabaseCollectionName[LANG],
					'required': true
				},
				{
					'name': 'stringify',
					'label': translation.stringified[LANG],
					'type': 'radio',
					'value': [{'v': false, 'selected': true}, {'v': true}],
					'required': true
				},
				{
					'name': 'expireAfter',
					'label': translation.expiresAfter[LANG],
					'type': 'text',
					'tooltip': translation.enterNumberHoursBeforeSessionExpires[LANG],
					'value': '',
					'placeholder': '300...',
					'required': true
				},
				{
					'name': 'store',
					'label': translation.store[LANG],
					'type': 'textarea',
					'rows': 5,
					'placeholder': '{}',
					'value': '',
					'tooltip': translation.provideTheSessionDatabaseStore[LANG],
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
					'label': translation.clusterName[LANG],
					'type': 'text',
					'placeholder': translation.cluster1[LANG],
					'value': '',
					'tooltip': translation.enterEnvironmentClusterName[LANG],
					'required': true
				},
				{
					'name': 'servers',
					'label': translation.serversList[LANG],
					'type': 'textarea',
					'rows': 2,
					'placeholder': '127.0.0.1:4000, 127.0.0.1:5000 ...',
					'value': '',
					'tooltip': translation.enterListServersSeparatedComma[LANG],
					'required': true
				},
				{
					'name': 'credentials',
					'label': translation.credentials[LANG],
					'type': 'textarea',
					'rows': 4,
					'placeholder': JSON.stringify({
						"username": translation.admin[LANG],
						"password": translation.password[LANG]
					}, null, "\t"),
					'value': '',
					'tooltip': translation.enterCredentialsCluster[LANG],
					'required': false
				},
				{
					'name': 'urlParam',
					'label': translation.URLParameters[LANG],
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
					'tooltip': translation.enterURLParametersCluster[LANG],
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
					'tooltip': translation.enterExtraParametersCluster[LANG],
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
					'tooltip': translation.hostNumber[LANG],
					'fieldMsg': translation.enterHowManyHostsAddForService[LANG],
					'required': true
				},
				{
					'name': 'variables',
					"label": translation.environmentVariables[LANG],
					"type": "textarea",
					"required": false,
					"tooltip": translation.provideOptionalEnvironmentVariablesSeparatedComma[LANG],
					"fieldMsg": "ENV_VAR1=val1,ENV_VAR2=val2,..."
				},
				{
					"name": "defaultENVVAR",
					"type": "html",
					"value": "<p>" + translation.defaultEnvironmentVariables[LANG] + "<br /><ul><li>SOAJS_SRV_AUTOREGISTER=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=%envName%</li><li>SOAJS_PROFILE=%profilePathToUse%</li></ul></p>"
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
					'label': translation.controller[LANG],
					'type': 'number',
					'placeholder': '1',
					'value': '',
					'tooltip': translation.chooseHowManyControllersDeploy[LANG],
					'fieldMsg': translation.chooseHowManyControllersDeploy[LANG],
					'required': true
				},
				{
					'name': 'branch',
					'label': 'Branch',
					'type': 'select',
					'value': [],
					'fieldMsg': 'Select a branch to deploy from',
					'required': true
				},
				{
					'name': 'variables',
					"label": translation.environmentVariables[LANG],
					"type": "textarea",
					"required": false,
					"tooltip": translation.provideOptionalEnvironmentVariablesSeparatedComma[LANG],
					"fieldMsg": "ENV_VAR1=val1,ENV_VAR2=val2,..."
				},
				{
					"name": "defaultENVVAR",
					"type": "html",
					"value": "<p>" + translation.defaultEnvironmentVariables[LANG] + "<br /><ul><li>SOAJS_SRV_AUTOREGISTER=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=%envName%</li><li>SOAJS_PROFILE=%profilePathToUse%</li></ul></p>"
				}
			]
		},
		uploadCerts: {
			'entries': [
				{
					'name': 'uploadCerts',
					'label': translation.certificates[LANG],
					'type': 'document',
					'tooltip': translation.uploadCertificate[LANG],
					'required': false,
					"limit": 3,
					'fieldMsg': "Upload certificates in .pem format."
				}
			]
		},
		editDriverConfig: {
			'entries': [
				{
					'name': 'name',
					'label': translation.driverName[LANG],
					'type': 'text',
					'tooltip': translation.driverName[LANG],
					'required': true,
					'value': ''
				},
				{
					'name': 'host',
					'label': translation.driverHost[LANG],
					'type': 'text',
					'tooltip': translation.driverHost[LANG],
					'required': true,
					'value': ''
				},
				{
					'name': 'port',
					'label': translation.driverPort[LANG],
					'type': 'number',
					'tooltip': translation.driverPort[LANG],
					'required': true,
					'value': ''
				},
				{
					'name': 'config',
					'label': translation.additionalConfiguration[LANG],
					'type': "textarea",
					'rows': 6,
					'required': false,
					'tooltip': translation.provideOptionalDriverConfiguration[LANG],
					'value': ''
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
		},
		"platforms": {
			"list": ['dashboard', '/environment/platforms/list'],
			"drivers": {
				"add": ['dashboard', '/environment/platforms/driver/add'],
				"edit": ['dashboard', '/environment/platforms/driver/edit'],
				"delete": ['dashboard', '/environment/platforms/driver/delete'],
				"changeSelected": ['dashboard', '/environment/platforms/driver/changeSelected']
			},
			"deployer": {
				"changeDeployerType": ['dashboard', '/environment/platforms/deployer/type/change']
			},
			"certs": {
				"upload": ['dashboard', '/environment/platforms/cert/upload'],
				"choose": ['dashboard', '/environment/platforms/cert/choose'],
				"delete": ['dashboard', '/environment/platforms/cert/delete']
			}
		}
	}
};
