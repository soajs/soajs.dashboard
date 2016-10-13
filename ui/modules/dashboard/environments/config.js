"use strict";
var modelObj = {
	cluster: {
		server: [
			{
				'name': 'host%count%',
				'label': 'Hostname',
				'type': 'text',
				'placeholder': '127.0.0.1',
				'required': true
			},
			{
				'name': 'port%count%',
				'label': 'Port',
				'type': 'text',
				'placeholder': '4000',
				'required': true
			},
			{
				"name": "removeServer%count%",
				"type": "html",
				"value": "<span class='red'><span class='icon icon-cross' title='Remove'></span></span>",
				"onAction": function (id, data, form) {
					var number = id.replace("removeServer", "");
					// need to decrease count
					delete form.formData['port' + number];
					delete form.formData['host' + number];
					form.entries.forEach(function (oneEntry) {
						if (oneEntry.type === 'group' && oneEntry.name === 'servers') {
							for (var i = oneEntry.entries.length - 1; i >= 0; i--) {
								if (oneEntry.entries[i].name === 'port' + number) {
									oneEntry.entries.splice(i, 1);
								}
								else if (oneEntry.entries[i].name === 'host' + number) {
									oneEntry.entries.splice(i, 1);
								}
								else if (oneEntry.entries[i].name === 'removeServer' + number) {
									oneEntry.entries.splice(i, 1);
								}
							}
						}
					});
				}
			}
		],
		credentials: [
			{
				'name': 'username',
				'label': translation.username[LANG],
				'type': 'text',
				'placeholder': translation.username[LANG],
				'tooltip': translation.enterCredentialsCluster[LANG],
				'required': false
			},
			{
				'name': 'password',
				'label': translation.password[LANG],
				'type': 'text',
				'placeholder': translation.password[LANG],
				'tooltip': translation.enterCredentialsCluster[LANG],
				'required': false
			}
		]
	}
};
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
				    'type': 'jsoneditor',
				    'options': {
				        'mode': 'code',
				        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
				    },
				    'height': '200px',
				    'value': {},
				    'required': true,
					'tooltip': translation.provideTheSessionDatabaseStore[LANG]
				}
			]
		},
		clusterType: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'type',
					'label': translation.clusterType[LANG],
					'type': 'select',
					'placeholder': translation.clusterTypePlaceHolder[LANG],
					'value': [
						{v: 'mongo', l: 'Mongo db'},
						{v: 'es', l: 'Elasticsearch'},
						{v: 'sql', l: 'My SQL'},
						{v: 'oracle', l: 'Oracle'}
					],
					'tooltip': translation.clusterTypePlaceHolderTooltip[LANG],
					'required': true
				}
			]
		},
		clusters: {
			default: {
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
						'tooltip': translation.enterListServersSeparatedComma[LANG],
						"type": "group",
						'collapsed': false,
						"class": "serversList",
						"entries": []
					},
					{
						"name": "addServer",
						"type": "html",
						"value": '<span class=""><input type="button" class="btn btn-sm btn-success" value="Add New Server"></span>'
					},
					{
						'name': 'credentials',
						'label': translation.credentials[LANG],
						'tooltip': translation.enterCredentialsCluster[LANG],
						"type": "group",
						'collapsed': false,
						'required': false,
						"class": "floatGroup",
						"entries": modelObj.cluster.credentials
					},
					{
					    'name': 'urlParam',
					    'label': translation.URLParameters[LANG],
					    'type': 'jsoneditor',
					    'options': {
					        'mode': 'code',
					        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
					    },
					    'height': '200px',
					    "value": {},
					    'required': true,
					    'tooltip': translation.enterURLParametersCluster[LANG],
					},
					{
					    'name': 'extraParam',
					    'label': 'Extra Parameters',
					    'type': 'jsoneditor',
					    'options': {
					        'mode': 'code',
					        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
					    },
					    'height': '200px',
					    "value": {},
					    'required': true,
					    'tooltip': translation.enterExtraParametersCluster[LANG],
					},
					{
					    'name': 'streaming',
					    'label': 'Streaming Options',
					    'type': 'jsoneditor',
					    'options': {
					        'mode': 'code',
					        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
					    },
					    'height': '200px',
					    "value": {},
					    'required': true
					}
				]
			},
			mongo: {
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
						'tooltip': translation.enterListServersSeparatedComma[LANG],
						'required': true,
						"type": "group",
						'collapsed': false,
						"class": "serversList",
						"entries": []
					},
					{
						"name": "addServer",
						"type": "html",
						"value": '<span class=""><input type="button" class="btn btn-sm btn-success" value="Add New Server"></span>'
					},
					{
						'name': 'credentials',
						'label': translation.credentials[LANG],
						'tooltip': translation.enterCredentialsCluster[LANG],
						"type": "group",
						'collapsed': true,
						'required': false,
						"class": "floatGroup",
						"entries": modelObj.cluster.credentials
					},
					{
						'name': 'urlParam',
						'label': translation.URLParameters[LANG],
						'tooltip': translation.enterURLParametersCluster[LANG],
						'required': true,
						"type": "group",
						'collapsed': false,
						"class": "urlParams",
						"entries": [
							{
								'name': 'connectTimeoutMS',
								'label': 'connectTimeoutMS',
								'type': 'number',
								'placeholder': '0',
								'required': false
							},
							{
								'name': 'socketTimeoutMS',
								'label': 'socketTimeoutMS',
								'type': 'number',
								'placeholder': '0',
								'required': false
							},
							{
								'name': 'maxPoolSize',
								'label': 'maxPoolSize',
								'type': 'number',
								'placeholder': '5',
								'required': false
							},
							{
								'name': 'wtimeoutMS',
								'label': 'wtimeoutMS',
								'type': 'number',
								'placeholder': '0',
								'required': false
							},
							{
								'name': 'slaveOk',
								'label': 'slaveOk',
								'type': 'boolean',
								'placeholder': 'true',
								'required': false
							}

						]
					},
					{
					    'name': 'extraParam',
					    'label': 'Extra Parameters',
					    'type': 'jsoneditor',
					    'options': {
					        'mode': 'code',
					        'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
					    },
					    'height': '200px',
					    "value": {},
					    'required': true,
					    'tooltip': translation.enterExtraParametersCluster[LANG],
					}
				]
			},
			es: {
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
						'tooltip': translation.enterListServersSeparatedComma[LANG],
						"type": "group",
						'collapsed': false,
						"class": "serversList",
						"entries": []
					},
					{
						"name": "addServer",
						"type": "html",
						"value": '<span class=""><input type="button" class="btn btn-sm btn-success" value="Add New Server"></span>'
					},
					{
						'name': 'credentials',
						'label': translation.credentials[LANG],
						"type": "group",
						'collapsed': false,
						'required': false,
						"class": "floatGroup",
						"entries": modelObj.cluster.credentials
					},
					{
						'name': 'urlParam',
						'label': translation.URLParameters[LANG],
						'tooltip': translation.enterURLParametersCluster[LANG],
						'required': true,
						"type": "group",
						'collapsed': false,
						"class": "urlParams",
						"entries": [
							{
								'name': 'protocol',
								'label': 'protocol',
								'type': 'text',
								'placeholder': 'http',
								'required': false
							}
						]
					},
					{
						'name': 'extraParam',
						'label': 'Extra Parameters',
						'type': 'textarea',
						'rows': 8,
						'placeholder': JSON.stringify(
							{
								"requestTimeout": 30000,
								"keepAlive": true,
								"maxSockets": 300
							}
							, null, "\t"),
						'value': '',
						'tooltip': translation.enterExtraParametersCluster[LANG],
						'required': true
					}
				]
			}
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
		deploy: {
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
					'name': 'useLocalSOAJS',
					'label': 'Do you want to accelerate deployment by using the SOAJS package within the image?',
					'type': 'radio',
					'value': [{'v': true, 'l': 'Yes', 'selected': true}, {'v': false, 'l': 'No'}],
					'required': false
				},
				{
					'name': 'exposedPort',
					'label': 'Exposed Port',
					'type': 'number',
					'value': "",
					'fieldMsg': 'Mandatory: Specify a Nginx port to be exposed for this environment',
					'required': true
				},
				{
					'name': 'supportSSL',
					'label': 'Do you want to enable SSL for Nginx?',
					'type': 'radio',
					'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No', 'selected': true}],
					'required': false
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
		},
		restartHost: {
			'entries': [
				{
					'name': 'branch',
					'label': 'Select branch to be used in order to restart host',
					'type': 'select',
					'tooltip': 'Select Branch',
					'required': true,
					'value': []
				}
			]
		},
		serviceInfo: {
			'entries': [
				{
				    'name': 'jsonData',
				    'label': '',
				    'type': 'jsoneditor',
				    'options': {
				        'mode': 'view',
				        'availableModes': []
				    },
				    'height': '500px',
				    "value": {}
				}
			]
		},
		node: {
			'entries': [
				{
					'name': 'ip',
					'label': translation.nodeIP[LANG],
					'type': 'text',
					'tooltip': translation.nodeIP[LANG],
					'required': true,
					'value': ''
				},
				{
					'name': 'port',
					'label': translation.nodeDockerPort[LANG],
					'type': 'number',
					'tooltip': translation.nodeDockerPort[LANG],
					'required': true,
					'value': ''
				},
				{
					'name': 'role',
					'label': translation.nodeRole[LANG],
					'type': 'select',
					'value': [
						{l: 'Manager', v: 'manager'},
						{l: 'Worker', v: 'worker', selected: true}
					],
					'tooltip': translation.nodeRole[LANG],
					'required': true
				}
			]
		}
	},
	nginxRequiredCerts: {
		certificate: {
			label: 'Chained Certificate',
			extension: '.crt'
		},
		privateKey: {
			label: 'Private Key',
			extension: '.key',
			msg: 'Key from SSL Provider'
		}
	},
	jsoneditorConfig: {
		'options': {
			'mode': 'code',
			'availableModes': [{'v': 'code', 'l': 'Code View'}, {'v': 'tree', 'l': 'Tree View'}, {'v': 'form', 'l': 'Form View'}]
		},
		'height': '200px'
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
			},
			"containers": {
				"restartHost": ['dashboard', '/environment/nginx/redeploy'],
				"restartNginx": ['dashboard', '/environment/hosts/redeployService']
			}
		}
	}
};
