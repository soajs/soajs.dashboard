'use strict';

var catalogAppConfig = {
	form: {
		add: {
			entries: [
				{
					'name': 'template',
					'label': 'Existing Recipe Template',
					'type': 'select',
					'value': [],
					'required': true
				}
			],
			new: [
				{
					'name': 'type',
					'label': "Recipe Type",
					'type': 'select',
					'tooltip': "Choose the Type of Recipe you want to create",
					'fieldMsg': "Pick the type of recipes you want to create depending on what you are aiming to deploy.",
					'value' :[
						{'v': 'service', 'l': "Service"},
						{'v': 'daemon', 'l': "Daemon"},
						{'v': 'cluster', 'l': "Cluster"},
						{'v': 'server', 'l': "Server"},
						{'v': 'cdn', 'l': "CDN"},
						{'v': 'system', 'l': "System"},
						{'v': 'other', 'l': "Other"}
					],
					'required': true
				}
			],
			categories: {
				'name': 'subtype',
				'label': "Category",
				'type': 'select',
				'value' : [
					{'v': 'soajs', 'l': "SOAJS", "group": "service"},
					{'v': 'nodejs', 'l': "NodeJs", "group": "service"},
					{'v': 'php', 'l': "PHP", "group": "service"},
					{'v': 'java', 'l': "Java", "group": "service"},
					{'v': 'asp', 'l': "ASP", "group": "service"},
					{'v': 'other', 'l': "Other", "group": "service"},

					{'v': 'soajs', 'l': "SOAJS", "group": "daemon"},
					{'v': 'nodejs', 'l': "NodeJs", "group": "daemon"},
					{'v': 'php', 'l': "PHP", "group": "daemon"},
					{'v': 'java', 'l': "Java", "group": "daemon"},
					{'v': 'asp', 'l': "ASP", "group": "daemon"},
					{'v': 'other', 'l': "Other", "group": "daemon"},

					{'v': 'mongo', 'l': "Mongo", "group": "cluster"},
					{'v': 'elasticsearch', 'l': "ElasticSearch", "cluster": "cluster"},
					{'v': 'mysql', 'l': "MySQL", "group": "cluster"},
					{'v': 'oracle', 'l': "Oracle", "group": "cluster"},
					{'v': 'other', 'l': "Other", "group": "cluster"},

					{'v': 'nginx', 'l': "Nginx", "group": "server"},
					{'v': 'apache', 'l': "Apache", "group": "server"},
					{'v': 'iis', 'l': "IIS", "group": "server"},
					{'v': 'other', 'l': "Other", "group": "server"},

					{'v': 'amazons3', 'l': "Amazon S3", "group": "cdn"},
					{'v': 'rackspace', 'l': "Rackspace", "cluster": "cdn"},
					{'v': 'other', 'l': "Other", "group": "cdn"},

					{'v': 'kibana', 'l': "Kibana", "group": "system"},
					{'v': 'logstash', 'l': "Logstash", "group": "system"},
					{'v': 'filebeat', 'l': "Filebeat", "group": "system"},
					{'v': 'metricbeat', 'l': "Metricbeat", "group": "system"},
					{'v': 'other', 'l': "Other", "group": "system"}
				],
				'required': true
			}
		},

		entries: [
			{
				'name': 'name',
				'label': 'Recipe Name',
				'type': 'text',
				'value': '',
				'required': true,
				'tooltip': 'Enter a name for your recipe',
				'fieldMsg': "Enter a name for your recipe",
				"placeholder": "My Recipe ..."
			},
			{
				'name': 'description',
				'label': 'Recipe Description',
				'type': 'text',
				'value': '',
				'required': false,
				'tooltip': 'Enter a description for your recipe',
				'fieldMsg': "Enter a description for your recipe",
				"placeholder": "My Recipe Description ..."
			},
			{
				'name': 'type',
				'label': 'Recipe Type',
				'type': 'text',
				'value': '',
				'disabled': true,
				'required': true,
				'readonly': true
			},
			{
				'name': 'subtype',
				'label': 'Category',
				'type': 'text',
				'value': '',
				'disabled': true,
				'readonly': true
			},
			{
				'type': 'html',
				'value': '<hr><h2>Deploy Options</h2>'
			},
			{
				'type': 'tabset',
				'tabs': [
					{
						'label': 'Image',
						'entries': [
							{
								'type': 'text',
								'value': '',
								'label': 'Image Prefix',
								'name': 'imagePrefix',
								'placeholder': 'soajsorg',
								'tooltip': "Enter the Image Prefix",
								'fieldMsg': "Enter the Image Prefix",
								'required': false
							},
							{
								'type': 'text',
								'value': '',
								'label': 'Image Name',
								'name': 'imageName',
								'placeholder': 'ImageName',
								'tooltip': "Enter the Image Name",
								'fieldMsg': "Enter the Image Name",
								'required': true
							},
							{
								'type': 'text',
								'value': '',
								'name': 'imageTag',
								'label': 'Image Tag',
								'placeholder': 'latest',
								'tooltip': "Enter the Image Tag",
								'fieldMsg': "Enter the Image Tag",
								'required': false
							},
							{
								'type': 'select',
								'label': 'Image Pull Policy',
								'name': 'imagePullPolicy',
								'value': [
									{'v': 'IfNotPresent', 'l': 'IfNotPresent', 'selected': true},
									{'v': 'Always', 'l': 'Always'},
									{'v': 'Never', 'l': 'Never'}
								],
								'tooltip': "Select the Update Image Policy",
								'fieldMsg': "Select the Update Image Policy",
								'required': false
							},
							{
								'type': 'select',
								'label': 'Override Image during Deployment',
								'name': 'imageOverride',
								'value': [
									{'v': 'false', 'l': 'No', 'selected': true},
									{'v': 'true', 'l': 'Yes'},
								],
								'tooltip': "Define if the Image can be overridden while deploying service(s) from it",
								'fieldMsg': "Define if the Image can be overridden while deploying service(s) from it",
								'required': false
							}
						]
					},
					{
						'label': 'Repositories',
						'entries': [
							{
								'name': 'specifyGitConfiguration',
								'label': 'Specify Git Configuration',
								'type': 'select',
								'value': [
									{'v': 'true', 'l': "Yes", 'selected': true},
									{'v': 'false', 'l': "No"}
								],
								'required': true,
								'tooltip': 'Specify if this recipe can be used to deploy content from Repositories or not.',
								'fieldMsg': 'Specify if this recipe can be used to deploy content from Repositories or not.'
							}
						]
					},
					{
						'label': 'Readiness Probe',
						'entries': [
							{
								'name': 'readinessProbe',
								'label': 'Readiness Probe',
								'type': 'jsoneditor',
								'value': '',
								'required': false,
								'tooltip': 'Configure Readiness Proble, Kubernetes Only.',
								'fieldMsg': 'Configure Readiness Proble, Kubernetes Only.',
								'height': 200
							}
						]
					},
					{
						'label': 'Restart Policy',
						'entries': [
							{
								'type': 'text',
								'value': '',
								'label': 'Condition',
								'name': 'condition',
								'placeholder': 'any',
								'tooltip': "Define the condition that docker base the restart container policy upon",
								'fieldMsg': "Define the condition that docker base the restart container policy upon",
								'required': false
							},
							{
								'type': 'number',
								'value': '',
								'label': 'Maximum Attempts',
								'name': 'maxAttempts',
								'placeholder': '5',
								'tooltip': "Define how many times docker should restart the container after failure",
								'fieldMsg': "Define how many times docker should restart the container after failure",
								'required': false
							}
						]
					},
					{
						'label': 'Container',
						'entries': [
							{
								'type': 'text',
								'value': '',
								'label': 'Docker Swarm Network',
								'name': 'network',
								'placeholder': 'soajsnet',
								'tooltip': "Enter the Docker Swarm network name to use",
								'fieldMsg': "Enter the Docker Swarm network name to use",
								'required': false
							},
							{
								'type': 'text',
								'value': '',
								'label': 'Default Working Directory',
								'name': 'workingDir',
								'placeholder': '/opt/soajs/deployer/',
								'tooltip': "Enter a default working directory to use connected to the container via SSH",
								'fieldMsg': "Enter a default working directory to use connected to the container via SSH",
								'required': false
							}
						]
					},
					{
						'label': 'Voluming',
						'entries': [
							{
								'type': 'html',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Volume'/>",
								'name': 'addVolume'
							}
						]
					},
					{
						'label': 'Exposed Ports',
						'entries': [
							{
								'type': 'html',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Expose New Port'/>",
								'name': 'addPort'
							}
						]
					},
					{
						'label': 'Optional Labels',
						'entries': [
							{
								'type': 'html',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add New Labels'/>",
								'name': 'addLabel'
							}
						]
					}
				]
			},
			{
				'type': 'html',
				'value': '<hr><h2>Build Options</h2>'
			},
			{
				'type': 'tabset',
				'tabs': [
					{
						'label': 'Service',
						'entries': [
							{
								'name': 'accelerateDeployment',
								'label': 'Accelerate Deployment',
								'type': 'select',
								'value': [
									{'v': 'true', 'l': "Yes", 'selected': true},
									{'v': 'false', 'l': "No"},
								],
								'required': false,
								'tooltip': "SOAJS Deployer will copy <b>soajs</b> from the <b>soajsorg/soajs</b> image instead of installing it using <b>npm</b>.",
								'fieldMsg': "SOAJS Deployer will copy <b>soajs</b> from the <b>soajsorg/soajs</b> image instead of installing it using <b>npm</b>."
							},
							{
								'name': 'command',
								'label': 'Container Command',
								'type': 'text',
								'value': '',
								'placeholder': 'bash',
								'required': false,
								'tooltip': "Enter the command that the container should run once the container of this service is created.",
								'fieldMsg': "Enter the command that the container should run once the container of this service is created."
							},
							{
								'name': 'arguments',
								'label': 'Command Arguments',
								'type': 'textarea',
								'value': '',
								'placeholder': '-c\nnode . -T service',
								'required': false,
								'tooltip': "Provide the arguments for the Container Command; one argument per line",
								'fieldMsg': "Provide the arguments for the Container Command; one argument per line"
							},
						]
					},
					{
						'label': 'Environment Variables',
						'entries': [
							{
								'type': 'html',
								'name': 'addEnvVar',
								'value': "<input type='button' class='btn btn-sm btn-success f-right' value='Add Environment Variable'/>"
							}
						]
					}
				]
			}
		],

		envVars: {
			'name': 'envVarGroup',
			'type': 'group',
			'label': "New Variable",
			'icon': 'minus',
			'entries': [
				{
					'type': 'html',
					'value': '',
				},
				{
					'name': 'envVarName',
					'label': 'Variable Name',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the name of your environment variable',
					'fieldMsg': 'Enter the name of your environment variable',
					"placeholder": "MY_ENV_VAR"
				},
				{
					'name': 'envVarType',
					'label': 'Variable Type',
					'type': 'select',
					'value': [
						{'v': 'computed', 'l': "Computed", 'selected': true},
						{'v': 'static', 'l': "Static"},
						{'v': 'userInput', 'l': "User Input"}
					],
					'required': true,
					'tooltip': 'Select a type for your variable',
					'fieldMsg': 'Select a type for your variable'
				},
				{
					'name': 'envVarRemove',
					'type': 'html',
					'value': "<span class='icon icon-cross'></span>"
				}
			]
		},

		computedVar: {
			'name': 'computedVar',
			'label': 'Computed Variable',
			'type': 'select',
			'groups': ['NodeJs', 'SOAJS Service', 'SOAJS Daemon', 'SOAJS Service/Daemon', 'SOAJS Deployer', 'SOAJS GCS', 'GIT Information', 'SOAJS Mongo', 'SOAJS Nginx'],
			'value':[
				{'v': '$SOAJS_SRV_MEMORY', 'l': "$SOAJS_SRV_MEMORY", "group": "NodeJs"},

				{'v': '$SOAJS_SRV_PORT', 'l': "$SOAJS_SRV_PORT", "group": "SOAJS Service"},
				{'v': '$SOAJS_SRV_PORT_MAINTENANCE', 'l': "$SOAJS_SRV_PORT_MAINTENANCE", "group": "SOAJS Service"},

				{'v': '$SOAJS_DAEMON_GRP_CONF', 'l': "$SOAJS_DAEMON_GRP_CONF", "group": "SOAJS Daemon"},

				{'v': '$SOAJS_ENV', 'l': "$SOAJS_ENV", "group": "SOAJS Service/Daemon"},
				{'v': '$SOAJS_PROFILE', 'l': "$SOAJS_PROFILE", "group": "SOAJS Service/Daemon"},

				{'v': '$SOAJS_SRV_MAIN', 'l': "$SOAJS_SRV_MAIN", "group": "SOAJS Service/Daemon"},

				{'v': '$SOAJS_DEPLOY_HA', 'l': "$SOAJS_DEPLOY_HA", "group": "SOAJS Deployer"},
				{'v': '$SOAJS_HA_NAME', 'l': "$SOAJS_HA_NAME", "group": "SOAJS Deployer"},

				{'v': '$SOAJS_GC_NAME', 'l': "$SOAJS_GC_NAME", "group": "SOAJS GCS"},
				{'v': '$SOAJS_GC_VERSION', 'l': "$SOAJS_GC_VERSION", "group": "SOAJS GCS"},

				{'v': '$SOAJS_GIT_OWNER', 'l': "$SOAJS_GIT_OWNER", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_BRANCH', 'l': "$SOAJS_GIT_BRANCH", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_COMMIT', 'l': "$SOAJS_GIT_COMMIT", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_REPO', 'l': "$SOAJS_GIT_REPO", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_TOKEN', 'l': "$SOAJS_GIT_TOKEN", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_PROVIDER', 'l': "$SOAJS_GIT_PROVIDER", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_DOMAIN', 'l': "$SOAJS_GIT_DOMAIN", "group": "GIT Information"},
				{'v': '$SOAJS_GIT_PATH', 'l': "$SOAJS_GIT_PATH", "group": "GIT Information"},

				{'v': '$SOAJS_MONGO_NB', 'l': "$SOAJS_MONGO_NB", "group": "SOAJS Mongo"},
				{'v': '$SOAJS_MONGO_PREFIX', 'l': "$SOAJS_MONGO_PREFIX", "group": "SOAJS Mongo"},
				{'v': '$SOAJS_MONGO_RSNAME', 'l': "$SOAJS_MONGO_RSNAME", "group": "SOAJS Mongo"},
				{'v': '$SOAJS_MONGO_AUTH_DB', 'l': "$SOAJS_MONGO_AUTH_DB", "group": "SOAJS Mongo"},
				{'v': '$SOAJS_MONGO_SSL', 'l': "$SOAJS_MONGO_SSL", "group": "SOAJS Mongo"},
				{'v': '$SOAJS_MONGO_IP_N', 'l': "$SOAJS_MONGO_IP_N", "group": "SOAJS Mongo"},
				{'v': '$SOAJS_MONGO_PORT_N', 'l': "$SOAJS_MONGO_PORT_N", "group": "SOAJS Mongo"},

				{'v': '$SOAJS_EXTKEY', 'l': "$SOAJS_EXTKEY", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_DOMAIN', 'l': "$SOAJS_NX_DOMAIN", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_API_DOMAIN', 'l': "$SOAJS_NX_API_DOMAIN", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_SITE_DOMAIN', 'l': "$SOAJS_NX_SITE_DOMAIN", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_CONTROLLER_NB', 'l': "$SOAJS_NX_CONTROLLER_NB", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_CONTROLLER_IP_N', 'l': "$SOAJS_NX_CONTROLLER_IP_N", "group": "SOAJS Nginx"},
				{'v': '$SOAJS_NX_CONTROLLER_PORT', 'l': "$SOAJS_NX_CONTROLLER_PORT", "group": "SOAJS Nginx"}
			],
			'required': true,
			'tooltip': 'Select which entry this variable should be mapped to.',
			'fieldMsg': 'Select which entry this variable should be mapped to.'
		},

		staticVar: {
			'name': 'staticVar',
			'label': 'Static Variable Value',
			'type': 'text',
			'value': '',
			'required': true,
			'tooltip': 'Enter the value of your environment variable',
			'fieldMsg': 'Enter the value of your environment variable',
			"placeholder": "My Var Value"
		},

		userInputVar: {
			'type': 'group',
			'name': 'userInputVar',
			'label': 'User Input Variable Options',
			'icon': 'minus',
			'entries': [
				{
					'name': 'userInputLabel',
					'label': 'User Input Variable Label',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the label for your environment variable',
					'fieldMsg': 'Enter the label for your environment variable',
					"placeholder": "My Var Label"
				},
				{
					'name': 'userInputDefault',
					'label': 'User Input Variable Default Value',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter a default value of your environment variable',
					'fieldMsg': 'Enter a default value of your environment variable',
					"placeholder": "My Var Value"
				},
				{
					'name': 'userInputFieldMsg',
					'label': 'User Input Variable Tip',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter a tip message for your environment variable',
					'fieldMsg': 'Enter a tip message for your environment variable',
					"placeholder": "My Var Tip Message"
				}
			]
		},

		volumeInput: {
			'name': 'volumeGroup',
			"type": "group",
			"label": "New Volume",
			"entries": [
				{
					'name': 'volume',
					'label': 'Volume',
					'type': 'jsoneditor',
					'value': '',
					'required': true,
					'tooltip': 'Enter the volume configuration.',
					'fieldMsg': 'Enter the volume configuration.',
					'height': 100
				},
				{
					'name': 'volumeMount',
					'label': 'Volume Mount',
					'type': 'jsoneditor',
					'value': '',
					'required': true,
					'tooltip': 'Enter the volume mount configuration; Kubernetes Only.',
					'fieldMsg': 'Enter the volume mount configuration; Kubernetes Only.',
					'height': 100
				},
				{
					'type': 'html',
					'name': 'rVolume',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},

		portInput: {
			'name': 'portGroup',
			'type': 'group',
			'label': 'New Port',
			'entries': [
				{
					'name': 'port',
					'label': 'Port',
					'type': 'jsoneditor',
					'value': '',
					'required': true,
					'tooltip': 'Enter the port configuration.',
					'fieldMsg': 'Enter the port configuration.',
					'height': 100
				},
				{
					'type': 'html',
					'name': 'rPort',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		},

		labelInput: {
			'name': 'labelGroup',
			'type': 'group',
			'label': 'New Label',
			'entries': [
				{
					'name': 'labelName',
					'label': 'Label Name',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the name of the label',
					'fieldMsg': 'Enter the name of the label',
					'placeholder': "My Label"
				},
				{
					'name': 'labelValue',
					'label': 'Label Value',
					'type': 'text',
					'value': '',
					'required': true,
					'tooltip': 'Enter the value of the label',
					'fieldMsg': 'Enter the value of the label',
					'placeholder': "My Label Value"
				},
				{
					'type': 'html',
					'name': 'rLabel',
					'value': '<span class="icon icon-cross"></span>'
				}
			]
		}
	},
	templates: {
		recipe: {
			"name": "",
			"type": "",
			"description": "",
			"recipe": {
				"deployOptions": {
					"image": {
						"prefix": "",
						"name": "",
						"tag": "",
						"pullPolicy": "",
						"override": false
					},
					"specifyGitConfiguration": false,
					"readinessProbe": {
						"httpGet": {
							"path": "",
							"port": ""
						},
						"initialDelaySeconds": 0,
						"timeoutSeconds": 0,
						"periodSeconds": 0,
						"successThreshold": 0,
						"failureThreshold": 0
					},
					"ports": [],
					"voluming": {
						"volumes": [],
						"volumeMounts": []
					},
					"restartPolicy": {
						"condition": "",
						"maxAttempts": 0
					},
					"container": {
						"network": "",
						"workingDir": ""
					}
				},
				"buildOptions": {
					"settings": {
						"accelerateDeployment": true
					},
					"env": {},
					"cmd": {
						"deploy": {
							"command": [],
							"args": []
						}
					}
				}
			}
		}
	},
	permissions: {
		list: ['dashboard', '/catalog/recipes/list', 'get'],
		add: ['dashboard', '/catalog/recipes/add', 'post'],
		update: ['dashboard', '/catalog/recipes/update', 'put'],
		delete: ['dashboard', '/catalog/recipes/delete', 'delete'],
		upgrade: ['dashboard', '/catalog/recipes/upgrade', 'get']
	}

};
