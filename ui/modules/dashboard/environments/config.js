"use strict";
var serviceProviders = [
	{
		v: 'aws',
		l: 'Amazon Web Services',
		image: 'http://cloudzone.azurewebsites.net/wp-content/uploads/2015/12/amazon-aws-s3-storage-logo.png'
	},
	{
		v: 'rackspace',
		l: 'Rackspace',
		image: 'https://cdn.saaspass.com/a52e2205866340ea/authenticators/rackspace_128.png'
	},
	{
		v: 'google',
		l: 'Google Cloud',
		image: 'https://cloud.google.com/_static/images/cloud/cloud_64dp.png'
	},
	{
		v: 'azure',
		l: 'Microsoft Azure',
		image: 'https://dtb5pzswcit1e.cloudfront.net/assets/images/product_logos/icon_azure@2x.png'
	},
	{
		v: 'joyent',
		l: 'Joyent',
		image: 'https://cdn1.itcentralstation.com/vendors/logos/original/joyent_avatar_reasonably_small.png?1371107403'
	},
	{
		'v': 'liquidweb',
		l: 'Liquid Web',
		image: 'https://www.liquidweb.com/favicon-32x32.png'
	},
	{
		'v': 'digitalocean',
		l: 'Digital Ocean',
		image: 'https://cdn.zapier.com/storage/developer/f1ce9f60f6740b7862d589a7f755ad19.128x128.png'
	},
	{
		v: 'other',
		l: 'Ubuntu',
		image: 'https://assets.ubuntu.com/v1/cb22ba5d-favicon-16x16.png'
	}
];

var environmentsConfig = {
	deployer: {
		kubernetes: {
			"minPort": 0,
			"maxPort": 2767
		},
		certificates: {
			required: ['ca', 'cert', 'key']
		}
	},
	
	customRegistryIncrement : 20,
	
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
					'name': 'sensitive',
					'label': "Sensitive",
					'type': 'radio',
					'value': [
						{
							'v': false,
							'l': "False",
							'selected': true
						},
						{
							'v': true,
							'l': "True"
						}
					],
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
					'name': 'prefix',
					'label': "Custom Prefix",
					'type': 'text',
					'placeholder': 'soajs_',
					'value': '',
					'tooltip': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'fieldMsg': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'required': false
				},
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
					'type': 'select',
					'value': [{'v': '', 'l': ''}],
					'required': true
				},
				{
					'name': 'tenantSpecific',
					'label': translation.tenantSpecific[LANG],
					'type': 'radio',
					'value': [
						{
							'v': false,
							'l': "False"
						},
						{
							'v': true,
							'l': "True"
						}
					],
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
					'name': 'prefix',
					'label': "Custom Prefix",
					'type': 'text',
					'placeholder': 'soajs_',
					'value': '',
					'tooltip': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'fieldMsg': "Enter a custom prefix for this Database or leave empty to use the global prefix value.",
					'required': false
				},
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
					'type': 'select',
					'value': [{'v': '', 'l': ''}],
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
					'height': '200px',
					'value': {},
					'required': true,
					'tooltip': translation.provideTheSessionDatabaseStore[LANG]
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
		deploy: {
			'name': '',
			'label': '',
			'actions': {},
			'entries': [
				{
					'name': 'nginx',
					'label': 'Nginx Configuration',
					'type': 'group',
					'description':{
						'type': 'info',
						'content': ""
					},
					'entries': [
						{
							'name': 'nginxDeploymentMode',
							'label': 'Nginx Deployment Mode',
							'type': 'select',
							'value': [
								{l: 'Replicated', v: 'replicated', 'selected': true},
								{l: 'Global', v: 'global'}
							],
							'tooltip': 'Specify the deployment mode',
							'required': true,
							'fieldMsg': "Global/Daemonset mode deploys one replica of the service on each node.<br />Replicated/Deployment mode deploys the specified number of replicas based on the availability of resources."
						},
						{
							'name': 'nginxCount',
							'label': translation.numberOfNginxInstances[LANG],
							'type': 'number',
							'value': '',
							'fieldMsg': 'Specify the number of Nginx instances',
							'required': true
						},
						{
							'name': 'nginxMemoryLimit',
							'label': 'Memory Limit Per Instance for Nginx (in MBytes)',
							'type': 'number',
							'value': 500,
							'fieldMsg': 'Set a custom memory limit for Nginx instances',
							'required': false
						},
						{
							'name': 'nginxRecipe',
							'label': 'Nginx Catalog Recipe',
							'type': 'select',
							'value': [],
							'tooltip': 'Specify the catalog recipe to be used when deploying nginx',
							'required': true
						}
					]
				},
				{
					'name': 'controllers',
					'label': 'Controller Configuration',
					'type': 'group',
					'description':{
						'type': 'none',
						'content': ""
					},
					'entries': [
						{
							'name': 'controllerDeploymentMode',
							'label': 'Controller Deployment Mode',
							'type': 'select',
							'value': [
								{l: 'Replicated', v: 'replicated', 'selected': true},
								{l: 'Global', v: 'global'}
							],
							'tooltip': 'Specify the deployment mode',
							'required': true,
							'fieldMsg': "Global/Daemonset mode deploys one replica of the service on each node.<br />Replicated/Deployment mode deploys the specified number of replicas based on the availability of resources."
						},
						{
							'name': 'controllers',
							'label': translation.controller[LANG],
							'type': 'number',
							'value': '',
							'tooltip': translation.chooseHowManyControllersDeploy[LANG],
							'fieldMsg': translation.chooseHowManyControllersDeploy[LANG],
							'required': true
						},
						{
							'name': 'ctrlMemoryLimit',
							'label': 'Memory Limit Per Instance for Controllers (in MBytes)',
							'type': 'number',
							'value': 500,
							'fieldMsg': 'Set a custom memory limit for controller instances',
							'required': false
						},
						{
							'name': 'ctrlRecipe',
							'label': 'Controller Catalog Recipe',
							'type': 'select',
							'value': [],
							'tooltip': 'Specify the catalog recipe to be used when deploying controller',
							'required': true
						}
					]
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
		multiServiceInfo: {
			'entries': [
				{
					'name': 'infoTabs',
					'label': '',
					'type': 'tabset',
					'tabs': []
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
		},
		nodeTag: {
			'entries': [
				{
					'name': 'tag',
					'label': "Service Provider",
					'type': 'uiselect',
					'value': serviceProviders,
					'tooltip': "Select Which Service Provider Hosts this node",
					'required': true,
					"fieldMsg": "Tag your nodes based on which Service Providers they are available at."
				}
			]
		},
		nginxUI: {
			entries: [
				{
					'name': 'content',
					'label': 'Static Content',
					'type': 'select',
					'required': false,
					'value': []
				},
				{
					'name': 'branch',
					'label': 'Branch',
					'type': 'select',
					'required': false,
					'value': []
				},
				{
					'name': 'supportSSL',
					'label': 'Do you want to enable SSL for Nginx?',
					'type': 'radio',
					'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No', 'selected': true}],
					'required': false
				},
				{
					'name': 'certType',
					'label': 'Do you want the system to generate self signed certificates?',
					'type': 'radio',
					'value': [{'v': true, 'l': 'Yes', 'selected': true}, {'v': false, 'l': 'No'}],
					'required': false,
					'hidden': true
				},
				{
					'name': 'kubeSecret',
					'label': 'Kubernetes secret',
					'type': 'text',
					'value': null,
					'fieldMsg': 'Provide the kubernetes secret that contains the certificates',
					'required': false,
					'hidden': true
				},
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
		'height': '200px'
	},
	
	permissions: {
		"listEnvironments": ['dashboard', '/environment/list', 'get'],
		"getEnvironment": ['dashboard', '/environment', 'get'],
		"addEnvironment": ['dashboard', '/environment/add', 'post'],
		"deleteEnvironment": ['dashboard', '/environment/delete', 'delete'],
		"editEnvironment": ['dashboard', '/environment/update', 'put'],
		"listHosts": ['dashboard', '/hosts/list', 'get'],
		"cd": ['dashboard', '/cd', 'post'],
		"dbs": {
			"list": ['dashboard', '/environment/dbs/list', 'get'],
			"add": ['dashboard', '/environment/dbs/add', 'post'],
			"delete": ['dashboard', '/environment/dbs/delete', 'delete'],
			"update": ['dashboard', '/environment/dbs/update', 'put'],
			"updatePrefix": ['dashboard', '/environment/dbs/updatePrefix', 'put']
		},
		"platforms": {
			"list": ['dashboard', '/environment/platforms/list', 'get'],
			"drivers": {
				"changeSelected": ['dashboard', '/environment/platforms/driver/changeSelected', 'put']
			},
			"deployer": {
				"changeDeployerType": ['dashboard', '/environment/platforms/deployer/type/change', 'put']
			},
			"certs": {
				"upload": ['dashboard', '/environment/platforms/cert/upload', 'post'],
				"choose": ['dashboard', '/environment/platforms/cert/choose', 'put'],
				"delete": ['dashboard', '/environment/platforms/cert/delete', 'delete']
			}
		},
		"hacloud": {
			"nodes": {
				"list": ['dashboard', '/cloud/nodes/list', 'get'],
				"add": ['dashboard', '/cloud/nodes/add', 'post'],
				"remove": ['dashboard', '/cloud/nodes/remove', 'delete'],
				"update": ['dashboard', '/cloud/nodes/update', 'put']
			},
			"services": {
				"list": ['dashboard', '/cloud/services/list', 'get'],
				"add": ['dashboard', '/cloud/hosts/deployService', 'post'],
				"delete": ['dashboard', '/cloud/services/delete', 'delete'],
				"scale": ['dashboard', '/cloud/services/scale', 'put'],
				"redeploy": ['dashboard', '/cloud/services/redeploy', 'put'],
				"logs": ['dashboard', '/cloud/services/instances/logs', 'get'],
				"operation": ['dashboard', '/cloud/services/maintenance', 'post'],
				"deployPlugin": ['dashboard', '/cloud/plugins/deploy', 'post'],
				"autoScale": ['dashboard', '/cloud/services/autoscale', 'put'],
			}
		},
		"analytics": {
			"getSettings": ["dashboard", "/analytics/getSettings", "get"],
			"activate": ["dashboard", "/analytics/activateAnalytics", "get"],
			"deactivate": ["dashboard", "/analytics/deactivateAnalytics", "get"]
		},
		"git": {
			"listAccounts": ["dashboard", "/gitAccounts/accounts/list", "get"],
			"listAccountRepos": ["dashboard", "/gitAccounts/getRepos", "get"]
		},
		"customRegistry": {
			"list": ["dashboard", "/customRegistry/list", "get"],
			"add": ["dashboard", "/customRegistry/add", "post"],
			"update": ["dashboard", "/customRegistry/update", "put"],
			"upgrade": ["dashboard", "/customRegistry/upgrade", "put"],
			"delete": ["dashboard", "/customRegistry/delete", "delete"]
		}
	},

	providers: serviceProviders,

	recipeTypes: {
		soajs:{
			l:"SOAJS",
			'categories': {
				other: {'l': "Other"}
			}
		},
		database:{
			l:"Database",
			'categories': {
				other: {'l': "Other"}
			}
		},
		nginx:{
			l:"Nginx",
			'categories': {
				other: {'l': "Other"}
			}
		},
		service: {
			'l': "Service",
			'categories': {
				soajs:{
					l:'SOAJS'
				},
				nodejs:{
					l:'NodeJs'
				},
				php:{
					l:'PHP'
				},
				java:{
					l:'Java'
				},
				asp:{
					l:'ASP'
				},
				other:{
					l:'Other'
				}
			}
		},
		daemon: {
			'l': "Daemon",
			'categories': {
				soajs:{
					l:'SOAJS'
				},
				nodejs:{
					l:'NodeJs'
				},
				php:{
					l:'PHP'
				},
				java:{
					l:'Java'
				},
				asp:{
					l:'ASP'
				},
				other:{
					l:'Other'
				}
			}
		},
		cluster: {
			'l': "Cluster",
			'categories': {
				mongo: {'l': "Mongo"},
				elasticsearch: {'l': "ElasticSearch"},
				mysql: {'l': "MySQL"},
				oracle: {'l': "Oracle"},
				other: {'l': "Other"}
			}
		},
		server: {
			'l': "Server",
			'categories': {
				nginx: {
					'l': "Nginx"
				},
				apache: {
					'l': "Apache"
				},
				iis: {
					'l': "IIS"
				},
				other: {
					'l': "Other"
				}
			}
		},
		cdn: {
			'l': "CDN",
			'categories': {
				amazons3: {"l": "Amazon S3"},
				rackspace: {"l": "Rackspace"},
				// cloudflare: {"l": "Cloudflare"},
				other: {"l": "Other"}
			}
		},
		system: {
			'l': "System",
			'categories': {
				kibana: {'l': "Kibana"},
				metricbeat: {'l': "Metricbeat"},
				logstash: {'l': "Logstash"},
				filebeat: {'l': "Filebeat"},
				other: {"l": "Other"}
			}
		},
		other:{
			'l': "Other",
			'categories': {
				other: {'l': "Other"}
			}
		}
	}
};
