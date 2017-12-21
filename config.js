'use strict';
var serviceConfig = require("./schemas/serviceConfig");
var cbSchema = require("./schemas/cb");
var aclSchema = require("./schemas/acl");
var catalogSchema = require("./schemas/catalog");
var resourceSchema = require("./schemas/resource");
var customRegEntrySchema = require("./schemas/customRegistry");
var resourceDeployConfigSchema = require("./schemas/resourceDeployConfig");
var environmentSchema = require("./schemas/environmentSchema");
var cdOptions = require("./schemas/cdOptions");

module.exports = {
	type: 'service',
	prerequisites: {
		cpu: '',
		memory: ''
	},
	"serviceVersion": 1,
	"serviceName": "dashboard",
	"serviceGroup": "SOAJS Core Services",
	"servicePort": 4003,
	"requestTimeout": 60,
	"requestTimeoutRenewal": 5,
	"extKeyRequired": true,
	"awareness": true,
	"awarenessEnv": true,
	"oauth": true,
	"session": false,
	"uracDriver": true,
	"urac_Profile": true,
	"urac_ACL": true,
	"provision_ACL": true,
	"urac": true,
	"hasher": {
		"hashIterations": 1024,
		"seedLength": 32
	},

	"expDateTTL": 86400000,
	"ncpLimit": 16,

	"profileLocation": process.env.SOAJS_PROFILE_LOC || "/opt/soajs/FILES/profiles/",

	"images": {
		"nginx": 'nginx',
		"services": "soajs"
	},

	"templates": {
		"path": __dirname + '/templates/'
	},

	"network": 'soajsnet',

	"imagesDir": "/opt/soajs/deployer/",

	"kubeNginx": {
		"minPort": 0,
		"maxPort": 2767
	},

	"certificates": {
		types: ['ca', 'cert', 'key']
	},

	"docker": {
		"url": "https://hub.docker.com/v2/repositories/%organization%/%imagename%/tags/"
	},
	"HA": {
		"blacklist": ['soajs_mongo_password', 'soajs_git_token', 'soajs_config_repo_token'],
		"dynamicCatalogVariables": ['$SOAJS_NX_CONTROLLER_IP_N', '$SOAJS_MONGO_IP_N', '$SOAJS_MONGO_PORT_N'],
		"clustersList": ['mysql', 'sql', "mongo", 'mongodb', "es", 'elasticsearch']
	},

	"tokens": {
		"dotValue": ".",
		"dotToken": "__dot__",
		"dotRegexString": "\\."
	},

	"dashboardClusterResourceName": "dash_cluster",

	"gitAccounts": {
		"bitbucket": {
			apiDomain: 'https://api.bitbucket.org/1.0',
			routes: {
				getUserRecord: '/users/%USERNAME%',
				getAllRepos: '/user/repositories',
				getContent: '/repositories/%USERNAME%/%REPO_NAME%/raw/%BRANCH%/%FILE_PATH%',
				getBranches: '/repositories/%USERNAME%/%REPO_NAME%/branches'
			},
			oauth: {
				domain: 'https://bitbucket.org/site/oauth2/access_token'
			},
			"hash": {
				"algorithm": "sha256"
			},
			repoConfigsFolder: __dirname + '/repoConfigs',
			defaultConfigFilePath: "config.js",
			customConfigFilesPath: {
				"soajsFile": "soa.js",
				"swaggerFile": "swagger.yml"
			}
		},
		"bitbucket_enterprise": {
			userAgent: "SOAJS Bitbucket App",
			defaultConfigFilePath: "config.js",
			repoConfigsFolder: __dirname + '/repoConfigs',
			customConfigFilesPath: {
				"soajsFile": "soa.js",
				"swaggerFile": "swagger.yml"
			},
			"hash": {
				"algorithm": "sha256"
			},
			// required for OAuth
			apiDomain: '%PROVIDER_DOMAIN%/rest/api/1.0',
			downloadUrl: '%PROVIDER_DOMAIN%/projects/%PROJECT_NAME%/repos/%REPO_NAME%/browse/%PATH%?at=%BRANCH%&raw'
		},
		"github": {
			"protocol": "https",
			"domainName": "api.github.com",
			"apiDomain": "https://api.github.com",
			"apiVersion": "3.0.0",
			"timeout": 30000,
			"userAgent": "SOAJS GitHub App",
			"urls": {
				"getReposAuthUser": "https://api.github.com/user/repos",
				"getReposNonAuthUser": "https://api.github.com/users/%OWNER%/repos",
				"getReposPublicOrg": "https://api.github.com/orgs/%OWNER%/repos"
			},
			"tokenScope": ["repo", "admin:repo_hook"],
			"defaultConfigFilePath": "config.js",
			"customConfigFilesPath": {
				"soajsFile": "soa.js",
				"swaggerFile": "swagger.yml"
			},
			"repoConfigsFolder": __dirname + '/repoConfigs'
		}
	},

	"errors": require("./utils/errors"),

	"schema": {
		"commonFields": {
			"project": {
				"source": ['query.project'],
				"required": false,
				"validation": {
					"type": "string"
				}
			},
			"description": {
				"source": ['body.description'],
				"required": false,
				"validation": {
					"type": "string"
				}
			},
			"id": {
				"source": ['query.id'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"name": {
				"source": ['body.name'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"_TTL": {
				"source": ['body._TTL'],
				"required": true,
				"validation": {
					"type": "string",
					"enum": ['6', '12', '24', '48', '72', '96', '120', '144', '168']
				}
			},
			'appId': {
				"source": ['query.appId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			'key': {
				"source": ['query.key'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			'acl': aclSchema,
			"cluster": {
				"required": true,
				"source": ['body.cluster'],
				"validation": {
					"type": "object",
					"properties": {
						"clusterType": { "type": "string" },
						"URLParam": { "type": "object", "properties": {} },
						"servers": { "type": "array", "items": { "type": "object", "required": true } },
						"extraParam": { "type": "object", "properties": {} },
						"streaming": { "type": "object", "properties": {} },
						"credentials": {
							"type": "object",
							"properties": {
								"username": { "type": "string" },
								"password": { "type": "string" }
							}
						}
					}
				}
			},
			"services": {
				"source": ['body.services'],
				"required": true,
				"validation": {
					"type": "object",
					"properties": {
						"controller": {
							"required": true,
							"type": "object",
							"properties": {
								"maxPoolSize": { "type": "integer", "required": true },
								"authorization": { "type": "boolean", "required": true },
								"requestTimeout": { "type": "integer", "required": true, "min": 20, "max": 60 },
								"requestTimeoutRenewal": { "type": "integer", "required": true, "min": 0 }
							}
						},
						"config": serviceConfig
					}
				}
			},
			"secret": {
				"source": ['body.secret'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"redirectURI": {
				"source": ['body.redirectURI'],
				"required": false,
				"validation": {
					"type": "string",
					"format": "uri"
				}
			},
			"uId": {
				"source": ['query.uId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"userId": {
				"source": ['body.userId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"password": {
				"source": ['body.password'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"productCode": {
				"source": ['body.productCode'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric"
				}
			},
			"packageCode": {
				"source": ['body.packageCode'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric"
				}
			},
			"clearAcl": {
				"source": ['body.clearAcl'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"extKey": {
				"source": ['body.extKey'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			'expDate': {
				"source": ['body.expDate'],
				"required": false,
				"validation": {
					"type": "string",
					"format": "date-time"
				}
			},
			'device': {
				"source": ['body.device'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			'geo': {
				"source": ['body.geo'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			'envCode': {
				'source': ['body.envCode'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'config': {
				"source": ['body.config'],
				"required": true,
				"validation": {
					"type": "object"
				}
			},
			"deployer": {
				"required": true,
				"source": ['body.deployer'],
				"validation": {
					"type": "object",
					"properties": {
						"type": { "required": true, "type": "string", "enum": ['manual', 'container'] },
						"selected": { "type": "string", "required": false },
						"docker": {
							"type": "object",
							"required": false,
							"properties": {
								"selected": { "type": "string", "required": false },
								"boot2docker": {
									"type": "object",
									"required": false
								},
								"joyent": {
									"type": "object",
									"required": false
								},
								"socket": {
									"type": "object",
									"required": false
								},
								"rackspace": {
									"type": "object",
									"required": false
								}
							}
						}
					}
				}
			},

			"extKeyRequired": {
				"source": ['body.extKeyRequired'],
				"required": true,
				"validation": { "type": "boolean" }
			},

			"urac": {
				"required": true,
				"source": ["body.urac"],
				"validation": {
					"type": "boolean"
				}
			},
			"urac_Profile": {
				"required": true,
				"source": ["body.urac_Profile"],
				"validation": {
					"type": "boolean"
				}
			},
			"urac_ACL": {
				"required": true,
				"source": ["body.urac_ACL"],
				"validation": {
					"type": "boolean"
				}
			},
			"provision_ACL": {
				"required": true,
				"source": ["body.provision_ACL"],
				"validation": {
					"type": "boolean"
				}
			},
			"requestTimeout": {
				"source": ['body.requestTimeout'],
				"required": true,
				"validation": { "type": "integer", "min": 0 }
			},
			"requestTimeoutRenewal": {
				"source": ['body.requestTimeoutRenewal'],
				"required": true,
				"validation": { "type": "integer", "min": 0 }
			},
			'apis': {
				"required": true,
				"source": ['body.apis'],
				"validation": {
					"type": "array",
					"minItems": 1,
					"items": {
						"type": "object",
						"required": true,
						"properties": {
							"l": { "type": "string", "required": true },
							"v": { "type": "string", "required": true },
							"group": { "type": "string", "required": true },
							"groupMain": { "type": "boolean", "required": false }
						}
					}
				}
			},

			'jobs': {
				'source': ['body.jobs'],
				'required': true,
				'validation': {
					'type': 'object'
				}
			},
			'groupName': {
				'source': ['body.groupName'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'daemon': {
				'source': ['body.daemon'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'interval': {
				'source': ['body.interval'],
				'required': false,
				'validation': {
					'type': 'number'
				}
			},
			'cronTime': {
				'source': ['body.cronTime'],
				'required': false,
				'validation': {
					'type': 'text'
				}
			},
			'timeZone': {
				'source': ['body.timeZone'],
				'required': false,
				'validation': {
					'type': 'text'
				}
			},
			'cronTimeDate': {
				'source': ['body.cronTimeDate'],
				'required': false,
				'validation': {
					'type': 'text'
				}
			},

			'status': {
				'source': ['body.status'],
				'required': true,
				'validation': {
					'type': 'number',
					enum: [0, 1]
				}
			},
			'processing': {
				'source': ['body.processing'],
				'required': true,
				'validation': {
					'type': 'string',
					'enum': ['parallel', 'sequential']
				}
			},
			'order': {
				'source': ['body.order'],
				'required': true,
				'validation': {
					'type': 'array'
				}
			},
			'jobName': {
				'source': ['query.jobName'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'solo': {
				'source': ['body.solo'],
				'required': true,
				'validation': {
					'type': 'boolean'
				}
			},
			'type': {
				'source': ['body.type'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'owner': {
				'source': ['body.owner'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'repo': {
				'source': ['body.repo'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'branch': {
				'source': ['body.branch'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'main': {
				'source': ['body.main'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			'token': {
				'source': ['body.token'],
				'required': false,
				'validation': {
					'type': 'string'
				}
			},
			"oauthType": {
				"source": ['body.oauthType'],
				"required": true,
				"validation": {
					"type": "string",
					"enum": ["urac", "miniurac", "off"]
				}
			},
			'availableEnv': {
				'source': ['body.availableEnv'],
				'required': true,
				'validation': {
					'type': 'array',
					'items': { 'type': 'string' }
				}
			},
			"env": {
				'source': ['query.env'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			"namespace": {
				'source': ['query.namespace'],
				'required': false,
				'validation': {
					'type': 'string'
				}
			}
		},

		"get": {
			"/cd/ledger": {
				"_apiInfo": {
					"l": "Lists the ledgers of a specific environment",
					"group": "Continuous Delivery"
				},
				"start": {
					'source': ['query.start'],
					'required': false,
					'validation': {
						'type': 'number',
						'default': 0,
						'minimum': 0
					}
				},
				"commonFields": ['project', 'env']
			},

			"/environment": {
				_apiInfo: {
					"l": "Get Environment",
					"group": "Environment"
				},
				"commonFields": ['project'],
				"id": {
					"required": false,
					"source": ["query.id"],
					"validation": {
						"type": "string"
					}
				},
				"code": {
					"required": false,
					"source": ["query.code"],
					"validation": {
						"type": "string"
					}
				}
			},

			"/environment/list": {
				_apiInfo: {
					"l": "List Environments",
					"group": "Environment",
					"groupMain": true
				},
				"commonFields": ['project'],
				"short": {
					"required": false,
					"source": ["query.short", "body.short"],
					"validation": {
						"type": "boolean"
					}
				}
			},
			
			"/environment/profile": {
				_apiInfo: {
					"l": "Get Profile",
					"group": "Environment"
				},
				"commonFields": ['project']
			},

			"/environment/dbs/list": {
				_apiInfo: {
					"l": "List Environment Databases",
					"group": "Environment Databases"
				},
				"commonFields": ['project', 'env']
			},

			"/resources/list": {
				_apiInfo: {
					"l": "List Available Resources",
					"group": "Resources",
					"groupMain": true
				},
				"commonFields": ['project', 'env']
			},

			"/resources/get": {
				_apiInfo: {
					"l": "Get One Resource",
					"group": "Resources"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"name": {
					"source": ['query.name'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/resources/upgrade": {
				_apiInfo: {
					"l": "Upgrade Resources to latest version",
					"group": "Resources",
					"groupMain": true
				},
				"commonFields": ['project', 'env']
			},

			"/resources/config": {
				_apiInfo: {
					"l": "Get Resources Deploy Configuration",
					"group": "Resources"
				},
				"commonFields": ['project']
			},

			"/customRegistry/list": {
				_apiInfo: {
					"l": "List Custom Registry Entries",
					"group": "Custom Registry",
					"groupMain": true
				},
				"commonFields": ['project', 'env'],
				"start": {
					"source": ['query.start'],
					"required": false,
					"validation": {
						"type": "number"
					}
				},
				"end": {
					"source": ['query.end'],
					"required": false,
					"validation": {
						"type": "number"
					}
				}
			},

			"/customRegistry/get": {
				_apiInfo: {
					"l": "Get Custom Registry Entry",
					"group": "Custom Registry"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"name": {
					"source": ['query.name'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/environment/platforms/list": {
				_apiInfo: {
					"l": "List Environment Platforms",
					"group": "Environment Platforms"
				},
				"commonFields": ['project', 'env']
			},

			"/product/list": {
				_apiInfo: {
					"l": "List Products",
					"group": "Product",
					"groupMain": true
				},
				"commonFields": ['project']
			},

			"/product/get": {
				_apiInfo: {
					"l": "Get Product",
					"group": "Product"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"productCode": {
					"source": ["query.productCode"],
					"required": false,
					"validation": {
						"type": "string",
						"format": "alphanumeric",
						"maxLength": 6
					}
				}
			},

			"/product/packages/list": {
				_apiInfo: {
					"l": "List Product Packages",
					"group": "Product"
				},
				"commonFields": ['id', 'project']
			},

			"/product/packages/get": {
				_apiInfo: {
					"l": "Get Product Package",
					"group": "Product"
				},
				"commonFields": ['project'],
				"packageCode": {
					"source": ["query.packageCode"],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"productCode": {
					"source": ["query.productCode"],
					"required": true,
					"validation": {
						"type": "string",
						"format": "alphanumeric",
						"maxLength": 6
					}
				}
			},

			"/permissions/get": {
				_apiInfo: {
					"l": "Get Tenant Security Permissions",
					"group": "Tenant"
				},
				"commonFields": ['project'],
				"envCode": {
					"source": ["query.envCode"],
					"required": false,
					"validation": {
						"type": "string",
						"format": "alphanumeric"
					}
				}
			},

			"/key/get": {
				_apiInfo: {
					"l": "Get the user dashboard key",
					"group": "Tenant"
				},
				"commonFields": ['project']
			},

			"/tenant/list": {
				_apiInfo: {
					"l": "List Tenants",
					"group": "Tenant"
				},
				"commonFields": ['project'],
				"type": {
					"source": ['query.type'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ["admin", "product", "client"]
					}
				},
				"negate": {
					"source": ['query.negate'],
					"required": false,
					"default": false,
					"validation": {
						"type": "boolean"
					}
				}
			},

			"/tenant/get": {
				_apiInfo: {
					"l": "Get Tenant",
					"group": "Tenant"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"code": {
					"source": ["query.code"],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/tenant/oauth/list": {
				_apiInfo: {
					"l": "Get Tenant oAuth Configuration",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'project']
			},

			"/tenant/oauth/users/list": {
				_apiInfo: {
					"l": "List Tenant oAuth Users",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'project']
			},

			"/tenant/application/list": {
				_apiInfo: {
					"l": "List Tenant Applications",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'project']
			},

			"/tenant/application/key/list": {
				_apiInfo: {
					"l": "List Tenant Application Keys",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'project']
			},

			"/tenant/application/key/ext/list": {
				_apiInfo: {
					"l": "List Tenant Application External Keys",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'project']
			},

			"/tenant/application/key/config/list": {
				_apiInfo: {
					"l": "List Tenant Application Key Configuration",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'project']
			},

			"/tenant/db/keys/list": {
				_apiInfo: {
					"l": "List Dashboard Tenant Keys",
					"group": "Dashboard Tenants"
				},
				"commonFields": ['project']
			},

			"/settings/tenant/get": {
				_apiInfo: {
					"l": "Get Tenant",
					"group": "Tenant Settings"
				},
				"commonFields": ['project']
			},

			"/settings/tenant/oauth/list": {
				_apiInfo: {
					"l": "Get Tenant oAuth Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['project']
			},

			"/settings/tenant/oauth/users/list": {
				_apiInfo: {
					"l": "List Tenant oAuth Users",
					"group": "Tenant Settings"
				},
				"commonFields": ['project']
			},

			"/settings/tenant/application/list": {
				_apiInfo: {
					"l": "List Tenant Applications",
					"group": "Tenant Settings"
				},
				"commonFields": ['project']
			},

			"/settings/tenant/application/key/list": {
				_apiInfo: {
					"l": "List Tenant Application Keys",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'project']
			},

			"/settings/tenant/application/key/ext/list": {
				_apiInfo: {
					"l": "List Tenant Application External Keys",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'project']
			},

			"/settings/tenant/application/key/config/list": {
				_apiInfo: {
					"l": "List Tenant Application Key Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'project']
			},
			/*
			 * This API will return the env where a service is deployed.
			 * it takes the service name and renders an object having the following form :
			 * "env name : apiPrefix.domain"
			 */
			"/services/env/list": {
				_apiInfo: {
					"l": "List The Environment Where A Service Is Deployed",
					"group": "Services"
				},
				"commonFields": ['project'],
				'service': {
					'source': ['query.service'],
					'required': true,
					"validation": {
						"type": "string"
					}
				},
				'version': {
					'source': ['query.version'],
					'required': false,
					"validation": {
						"type": "integer"
					}
				}
			},

			"/daemons/groupConfig/serviceConfig/list": {
				_apiInfo: {
					"l": "List Service Configuration",
					"group": "Daemons"
				},
				'commonFields': ['id', 'jobName', 'project']
			},

			"/daemons/groupConfig/tenantExtKeys/list": {
				_apiInfo: {
					"l": "List Job's External Keys",
					"group": "Daemons"
				},
				'commonFields': ['id', 'jobName', 'project']
			},

			"/hosts/list": {
				_apiInfo: {
					"l": "List Hosts",
					"group": "Hosts",
					"groupMain": true
				},
				'commonFields': ['project', 'env']
			},
			"/hosts/awareness": {
				"_apiInfo": {
					"l": "Get Controller Hosts",
					"group": "Hosts"
				},
				"commonFields": ['project', 'env']
			},
			"/cloud/services/list": {
				"_apiInfo": {
					"l": "List Cloud Services",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env']
			},

			"/cloud/nodes/list": {
				"_apiInfo": {
					"l": "List HA Cloud Nodes",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env']
			},

			"/cloud/services/instances/logs": {
				"_apiInfo": {
					"l": "Get Service Container Logs",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env', 'namespace'],
				"serviceId": {
					"source": ['query.serviceId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"taskId": {
					"source": ['query.taskId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/cloud/namespaces/list": {
				"_apiInfo": {
					"l": "List Available Namespaces",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env']
			},

			"/cloud/resource": {
				"_apiInfo": {
					"l": "Check if resource is Deployed",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env'],
				"resource": {
					"source": ['query.resource'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"namespace": {
					"source": ['query.namespace'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/cloud/metrics/services": {
				"_apiInfo": {
					"l": "List Services Metrics",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env']
			},

			"/cloud/metrics/nodes": {
				"_apiInfo": {
					"l": "List Nodes Metrics",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env']
			},

			"/catalog/recipes/list": {
				"_apiInfo": {
					"l": "List Catalog Recipes",
					"group": "Catalog"
				},
				'commonFields': ['project'],
				'version': {
					"source": ['query.version'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				},
				'specifyGit': {
					"source": ['query.specifyGit'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				}
			},

			"/catalog/recipes/get": {
				"_apiInfo": {
					"l": "Get a Catalog",
					"group": "Catalog"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'version': {
					"source": ['query.version'],
					"required": false,
					"validation": {
						"type": "number"
					}
				}
			},

			"/catalog/recipes/upgrade": {
				"_apiInfo": {
					"l": "Upgrade Catalog Recipes to latest Version",
					"group": "Catalog"
				},
				'commonFields': ['project']
			},

			"/cd": {
				"_apiInfo": {
					"l": "Get CD Configuration",
					"group": "Continuous Delivery"
				},
				'commonFields': ['project']
			},

			"/cd/updates": {
				"_apiInfo": {
					"l": "Get Update Notification Ledger",
					"group": "Continuous Delivery"
				},
				'commonFields': ['project', 'env']
			},

			"/ci": {
				"_apiInfo": {
					"l": "Get CI Accounts",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				"owner": {
					"source": ['query.owner'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"variables": {
					"source": ['query.variables'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				},
				"port": {
					"source": ['query.port'],
					"required": false,
					"validation": {
						"type": "integer"
					}
				}
			},

			"/ci/providers": {
				"_apiInfo": {
					"l": "Get CI Providers",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				"owner": {
					"source": ['query.owner'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['query.provider'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/ci/recipe/download": {
				"_apiInfo": {
					"l": "Download CI Recipe",
					"group": "Continuous Integration"
				},
				"commonFields": ["id", 'project']
			},

			"/ci/script/download": {
				"_apiInfo": {
					"l": "Download CI Script",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				"provider": {
					"required": false,
					"source": ["query.provider"],
					"validation": {
						"type": "string"
					}
				}
			},

			"/ci/status": {
				"_apiInfo": {
					"l": "Turn On/Off Repository CI",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				'id': {
					'source': ['query.id'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'provider': {
					'source': ['query.provider'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'owner': {
					'source': ['query.owner'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'enable': {
					'source': ['query.enable'],
					'required': true,
					'validation': {
						'type': 'boolean'
					}
				}
			},

			"/ci/settings": {
				"_apiInfo": {
					"l": "Get CI Repository Settings & Environment Variables",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				'id': {
					'source': ['query.id'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'provider': {
					'source': ['query.provider'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'owner': {
					'source': ['query.owner'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				}
			},

			"/ci/repo/remote/config": {
				"_apiInfo": {
					"l": "Get the CI configuration file of the repository from provider",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				"provider": {
					"source": ['query.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"repo": {
					"source": ['query.repo'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"branch": {
					"source": ['query.branch'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"owner": {
					"source": ['query.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/gitAccounts/accounts/list": {
				"_apiInfo": {
					"l": "List Git Accounts",
					"group": "Git Accounts"
				},
				'commonFields': ['project']
			},

			"/gitAccounts/getRepos": {
				"_apiInfo": {
					"l": "Get Repositories",
					"group": "Git Accounts"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['query.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"page": {
					"source": ['query.page'],
					"required": true,
					"validation": {
						"type": "number",
						"minimum": 1
					}
				},
				"per_page": {
					"source": ['query.per_page'],
					"required": true,
					"validation": {
						"type": "number",
						"minimum": 1
					}
				},
				"activeOnly": {
					"source": ['query.activeOnly'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				}
			},

			"/gitAccounts/getBranches": {
				"_apiInfo": {
					"l": "Get Repository Branches",
					"group": "Git Accounts"
				},
				'commonFields': ['project'],
				"name": {
					"source": ['query.name'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"type": {
					"source": ['query.type'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['query.provider'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			/*
			 * this API will get the content and the url of any file located on a specific
			 * github/bitbucket account for a certain repo.
			 * In our case we need to get the yaml file and its content
			 */
			"/gitAccounts/getYaml": {
				"_apiInfo": {
					"l": "Get Yaml file",
					"group": "Git Accounts"
				},
				'commonFields': ['project', 'env'],
				"owner": {
					"source": ['query.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"repo": {
					"source": ['query.repo'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"filepath": {
					"source": ['query.filepath'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"serviceName": {
					"source": ['query.serviceName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"version": {
					"source": ['query.version'],
					"required": false,
					"validation": {
						"type": "integer"
					}
				},
				"type": {
					"source": ['query.type'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			}
		},

		"post": {
			"/services/list": {
				_apiInfo: {
					"l": "List Services",
					"group": "Services"
				},
				'commonFields': ['project'],
				'includeEnvs': {
					'source': ['query.includeEnvs'],
					'required': false,
					'validation': {
						'type': 'boolean'
					}
				},
				'serviceNames': {
					'source': ['body.serviceNames'],
					'required': false,
					"validation": {
						"type": "array",
						'items': { 'type': 'string' }
					}
				}
			},

			"/environment/add": {
				_apiInfo: {
					"l": "Add Environment",
					"group": "Environment"
				},
				'commonFields': ['project'],
				"data": {
					"source": ['body.data'],
					"required": true,
					"validation": {
						"type": "object",
						"properties": environmentSchema
					}
				}
			},

			"/environment/dbs/add": {
				_apiInfo: {
					"l": "Add Environment Database",
					"group": "Environment Databases"
				},
				'commonFields': ['project', 'env'],
				"prefix": {
					"source": ['body.prefix'],
					"required": false,
					"validation": {
						"type": "string", "required": false
					}
				},
				"name": {
					"source": ['body.name'],
					"required": true,
					"validation": { "type": "string", "required": true }
				},
				"cluster": {
					"source": ['body.cluster'],
					"required": true,
					"validation": { "type": "string", "required": true }
				},
				"tenantSpecific": {
					"source": ['body.tenantSpecific'],
					"required": false,
					"validation": { "type": "boolean", "required": true }
				},
				"sessionInfo": {
					"source": ['body.sessionInfo'],
					"required": false,
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"store": { "type": "object", "required": true },
							"dbName": { "type": "string", "required": true },
							"expireAfter": { "type": "integer", "required": true },
							"collection": { "type": "string", "required": true },
							"stringify": { "type": "boolean", "required": true }
						}
					}
				}
			},

			"/resources/add": {
				_apiInfo: {
					"l": "Add New Resource",
					"group": "Resources"
				},
				'commonFields': ['project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"resource": resourceSchema
			},

			"/customRegistry/add": {
				_apiInfo: {
					"l": "Add New Custom Registry Entry",
					"group": "Custom Registry"
				},
				'commonFields': ['project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"customRegEntry": customRegEntrySchema
			},

			"/environment/platforms/cert/upload": {
				_apiInfo: {
					"l": "Upload Certificate",
					"group": "Environment Platforms"
				},
				'commonFields': ['project']
			},

			"/product/add": {
				_apiInfo: {
					"l": "Add Product",
					"group": "Product"
				},
				"commonFields": ['description', 'name', 'project'],
				"code": {
					"source": ['body.code'],
					"required": true,
					"validation": {
						"type": "string",
						"format": "alphanumeric",
						"minLength": 4,
						"maxLength": 5
					}
				}
			},

			"/product/packages/add": {
				_apiInfo: {
					"l": "Add Product Package",
					"group": "Product"
				},
				"commonFields": ['id', 'name', 'description', '_TTL', 'acl', 'project'],
				"code": {
					"source": ["body.code"],
					"required": true,
					"validation": {
						"type": "string",
						"format": "alphanumeric",
						"minLength": 4,
						"maxLength": 5
					}
				}
			},

			"/tenant/add": {
				_apiInfo: {
					"l": "Add Tenant",
					"group": "Tenant"
				},
				"commonFields": ['name', 'description', 'project'],
				"code": {
					"source": ['body.code'],
					"required": true,
					"validation": {
						"type": "string",
						"format": "alphanumeric",
						"maxLength": 4
					}
				},
				"type": {
					"source": ['body.type'],
					"required": false,
					"default": "client",
					"validation": {
						"type": "string",
						"enum": ["admin", "product", "client"]
					}
				},
				"tag": {
					"source": ['body.tag'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/tenant/oauth/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth Configuration",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'secret', 'redirectURI', 'oauthType', 'availableEnv', 'project']
			},

			"/tenant/oauth/users/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth User",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'userId', 'password', 'project']
			},

			"/tenant/application/add": {
				_apiInfo: {
					"l": "Add Tenant Application",
					"group": "Tenant Application"
				},
				"commonFields": ['id', '_TTL', 'description', 'acl', 'productCode', 'packageCode', 'project']
			},

			"/tenant/application/key/add": {
				_apiInfo: {
					"l": "Add Tenant Application Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'project']
			},

            "/tenant/application/key/ext/add": {
                _apiInfo: {
                    "l": "Add Tenant Application External Key",
                    "group": "Tenant Application"
                },
                "commonFields": ['id', 'appId', 'key', 'expDate', 'device', 'geo', 'project'],
                "env": {
                    "source": ['body.env'],
                    "required": true,
                    "validation": {
                        "type": "string"
                    }
                },
	            "dashboardAccess":{
		            "source": ['body.dashboardAccess'],
		            "required": true,
		            "default": false,
		            "validation": {
			            "type": "boolean"
		            }
	            }
            },

			"/tenant/application/key/ext/delete": { //TODO: should be delete, remove params passed in body and change its method
				_apiInfo: {
					"l": "Delete Tenant Application External Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'extKey', 'project'],
				"extKeyEnv": {
					"source": ['body.extKeyEnv'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/tenant/acl/get": { //TODO: should be changed from post to get
				_apiInfo: {
					"l": "Get Current Tenant Access Level",
					"group": "Tenant"
				},
				"commonFields": ['id', 'project']
			},

			"/settings/tenant/oauth/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['secret', 'redirectURI', 'oauthType', 'availableEnv', 'project']
			},

			"/settings/tenant/oauth/users/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth User",
					"group": "Tenant Settings"
				},
				"commonFields": ['userId', 'password', 'project']
			},

			"/settings/tenant/application/key/add": {
				_apiInfo: {
					"l": "Add Tenant Application Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'project']
			},

			"/settings/tenant/application/key/ext/add": {
				_apiInfo: {
					"l": "Add Tenant Application External Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['project', 'appId', 'key', 'expDate', 'device', 'geo'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"dashboardAccess": {
					"source": ['body.dashboardAccess'],
					"required": true,
					"default": false,
					"validation": {
						"type": "boolean"
					}
				},
			},

			"/settings/tenant/application/key/ext/delete": { //TODO: should be delete, remove params passed in body and change its method
				_apiInfo: {
					"l": "Delete Tenant Application External Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'extKey', 'project'],
				"extKeyEnv": {
					"source": ['body.extKeyEnv'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/daemons/groupConfig/list": {
				_apiInfo: {
					"l": "List Daemon Group Configuration",
					"group": "Daemons"
				},
				"commonFields": ['project'],
				'grpConfNames': {
					'source': ['body.grpConfNames'],
					'required': false,
					'validation': {
						'type': 'array',
						'items': { 'type': 'string' }
					}
				}
			},

			"/daemons/groupConfig/add": {
				_apiInfo: {
					"l": "Add Daemon Group Configuration",
					"group": "Daemons"
				},
				'commonFields': ['project',
					'groupName', 'daemon', 'cronTime', 'cronTimeDate', 'timeZone', 'interval', 'status', 'processing', 'jobs', 'order', 'solo'],
				'type': {
					"required": true,
					"source": ["body.type"],
					"validation": {
						"type": "string",
						"enum": ["interval", "cron", "once"]
					}
				}
			},

			"/daemons/list": {
				_apiInfo: {
					"l": "List Daemons",
					"group": "Daemons"
				},
				"commonFields": ['project'],
				'daemonNames': {
					'source': ['body.daemonNames'],
					'required': false,
					'validation': {
						'type': 'array',
						'items': { 'type': 'string' }
					}
				},
				'getGroupConfigs': {
					'source': ['query.getGroupConfigs'],
					'required': false,
					'validation': {
						'type': 'boolean'
					}
				}
			},

			"/cloud/services/soajs/deploy": {
				"_apiInfo": {
					"l": "Deploy A New SOAJS Service",
					"group": "HA Cloud"
				},
				"commonFields": ['project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"recipe": {
					"source": ['body.recipe'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"gitSource": {
					"required": false,
					"source": ['body.gitSource'],
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"owner": { "required": true, "type": "string" },
							"repo": { "required": true, "type": "string" },
							"branch": { "required": true, "type": "string" },
							"commit": { "required": false, "type": "string" }
						}
					}
				},
				"deployConfig": {
					"required": true,
					"source": ['body.deployConfig'],
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"memoryLimit": { "required": false, "type": "number", "default": 209715200 },
							"cpuLimit": { "required": false, "type": "string" },
							"isKubernetes": { "required": false, "type": "boolean" }, //NOTE: only required in case of controller deployment
							"replication": {
								"required": true,
								"type": "object",
								"properties": {
									"mode": {
										"required": true,
										"type": "string",
										"enum": ['replicated', 'global', 'deployment', 'daemonset']
									},
									"replicas": { "required": false, "type": "number" }
								}
							}
						}
					}
				},
				"autoScale": {
					"source": ['body.autoScale'],
					"required": false,
					"validation": {
						"type": "object",
						"properties": {
							"replicas": {
								"type": "object",
								"required": true,
								"properties": {
									"min": { "type": "number", "required": true },
									"max": { "type": "number", "required": true }
								}
							},
							"metrics": {
								"type": "object",
								"required": true,
								"properties": {
									//NOTE: only CPU metrics are supported
									"cpu": {
										"type": "object",
										"required": true,
										"properties": {
											"percent": { "type": "number", "required": true }
										}
									}
								}
							}
						}
					}
				},
				"custom": {
					"source": ["body.custom"],
					"required": false,
					"validation": {
						"type": "object",
						"required": false,
						"properties": {
							"image": {
								"type": "object",
								"required": false,
								"properties": {
									"prefix": { "required": false, "type": "string" },
									"name": { "required": false, "type": "string" },
									"tag": { "required": false, "type": "string" },
								}
							},
							"env": {
								"type": "object",
								"required": false,
								"additionalProperties": { "type": "string" }
							},
							"type": {
								"required": true,
								"type": "string"
							},
							"resourceId": {
								"required": false,
								"type": "string"
							},
							"name": {
								"required": false,
								"type": "string"
							},
							"version": {
								"required": false,
								"type": "number",
								"minimum": 1
							},
							"daemonGroup": {
								"required": false,
								"type": "string"
							},
							"gc": {
								"required": false,
								"type": "object",
								"properties": {
									"gcName": { "required": true, "type": "string" },
									"gcVersion": { "required": true, "type": "number" }
								}
							}
						}
					}
				}
			},

			"/cloud/plugins/deploy": {
				"_apiInfo": {
					"l": "Deploy A Custom Resource",
					"group": "HA Cloud"
				},
				"commonFields": ['project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"plugin": {
					"source": ['body.plugin'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ['heapster', 'metrics-server']
					}
				}
			},

			"/cloud/nodes/add": {
				"_apiInfo": {
					"l": "Add HA Cloud Node",
					"group": "HA Cloud"
				},
				"commonFields": ['project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"host": {
					"source": ['body.host'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"port": {
					"source": ['body.port'],
					"required": false,
					"validation": {
						"type": "number"
					}
				},
				"role": {
					"source": ['body.role'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ['manager', 'worker']
					}
				}
			},

			"/cloud/services/maintenance": {
				"_apiInfo": {
					"l": "Perform A Maintenance Operation on a Deployed Service",
					"group": "HA Cloud"
				},
				"commonFields": ['project', 'namespace'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"serviceId": {
					"source": ['body.serviceId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"serviceName": {
					"source": ['body.serviceName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"type": {
					"source": ['body.type'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"operation": {
					"source": ['body.operation'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["heartbeat", "reloadRegistry", "loadProvision", "awarenessStat", 'infoHost', 'daemonStats', 'reloadDaemonConf']
					}
				}
			},

			"/catalog/recipes/add": {
				"_apiInfo": {
					"l": "Add New Catalog",
					"group": "Catalog"
				},
				"commonFields": ['project'],
				"catalog": catalogSchema
			},

			"/ci/provider": {
				"_apiInfo": {
					"l": "Activate CI Provider",
					"group": "Continuous Integration"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['body.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"domain": {
					"source": ['body.domain'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['body.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"gitToken": {
					"source": ['body.gitToken'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"owner": {
					"source": ['body.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"version": {
					"source": ['body.version'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				}
			},

			"/ci/recipe": {
				"_apiInfo": {
					"l": "Add New CI Recipe",
					"group": "Continuous Integration"
				},
				"commonFields": ['project'],
				"provider": {
					"source": ['body.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"recipe": {
					"source": ['body.recipe'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"name": {
					"source": ['body.name'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/cd": {
				"_apiInfo": {
					"l": "Save CD Configuration for a specific Service",
					"group": "Continuous Delivery"
				},
				"commonFields": ['project'],
				"config": {
					"source": ['body.config'],
					"required": false,
					"validation": {
						"type": "object",
						"properties": {
							"env": { "type": "string", "required": true },
							"serviceName": { "type": "string", "required": true },
							"default": {
								"type": "object",
								"properties": {
									"branch": { "type": "string", "required": false, "minLengh": 1 },
									"strategy": { "type": "string", "enum": ["notify", "update"], "required": false },
									"deploy": { "type": "boolean", "required": false },
									"options": {
										"type": "object",
										"properties": cdOptions
									}
								},
								"additionalProperties": false
							},
							"version": {
								"type": "object",
								"properties": {
									"v": { "type": "string", "required": true, "pattern": /v[0-9]+$/ },
									"branch": { "type": "string", "required": false, "minLengh": 1 },
									"strategy": { "type": "string", "enum": ["notify", "update"], "required": false },
									"deploy": { "type": "boolean", "required": false },
									"options": {
										"type": "object",
										"properties": cdOptions
									}
								},
								"additionalProperties": false
							}
						},
						"additionalProperties": false
					}
				}
			},

			"/cd/pause": {
				"_apiInfo": {
					"l": "Pause CD Configuration",
					"group": "Continuous Delivery"
				},
				"commonFields": ['project'],
				"config": {
					"source": ['body.config'],
					"required": false,
					"validation": {
						"type": "object",
						"properties": {
							"env": { "type": "string", "required": true },
							"pause": { "type": "boolean", "required": false }
						},
						"additionalProperties": false
					}
				}
			},

			"/cd/deploy": {
				"_apiInfo": {
					"l": "Trigger CD Deployment",
					"group": "Continuous Delivery"
				},
				"commonFields": ['project'],
				"deploy_token": {
					"source": ['query.deploy_token'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"repo": {
					"source": ['body.repo'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"owner": {
					"source": ['body.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"branch": {
					"source": ['body.branch'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"commit": {
					"source": ['body.commit'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"ciProvider": {
					"source": ['body.ciProvider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"services": {
					"source": ['body.services'],
					"required": false,
					"validation": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"serviceName": { "type": "string", "required": true },
								"serviceVersion": { "type": "number", "required": false }
							}
						}
					}
				}
			},

			"/gitAccounts/login": {
				"_apiInfo": {
					"l": "Github Login",
					"group": "Git Accounts"
				},
				"commonFields": ['project'],
				"username": {
					"source": ['body.username'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"password": {
					"source": ['body.password'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"label": {
					"source": ['body.label'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['body.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"domain": {
					"source": ['body.domain'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"type": {
					"source": ['body.type'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"access": {
					"source": ['body.access'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"oauthKey": {
					"source": ['body.oauthKey'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"oauthSecret": {
					"source": ['body.oauthSecret'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/gitAccounts/repo/activate": {
				"_apiInfo": {
					"l": "Activate Repository",
					"group": "Git Accounts"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['body.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"owner": {
					"source": ['body.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"repo": {
					"source": ['body.repo'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"project": {
					"source": ['body.project'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"configBranch": {
					"source": ['body.configBranch'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/swagger/simulate": {
				"_apiInfo": {
					"l": "Api simulation service",
					"group": "Simulate",
					"groupMain": true
				},
				"commonFields": ['project'],
				"data": {
					"required": true,
					"source": ['body.data'],
					"validation": {
						"type": "object",
						"properties": {
							"input": {
								"type": "object",
								"properties": {}
							},
							"imfv": {
								"type": "object",
								"properties": {}
							}
						}
					}
				}

			},

			"/swagger/generate": {
				"_apiInfo": {
					"l": "Generate Service via Swagger",
					"group": "swagger",
					"groupMain": true
				},
				"commonFields": ['project'],
				"language": {
					"required": false,
					"source": ["body.language"],
					"default": "soajs",
					"validation": {
						"type": "string",
						"enum": ["soajs", "nodejs", "php", "asp"]
					}
				},
				"data": {
					"required": true,
					"source": ['body.data'],
					"validation": {
						"type": "object",
						"properties": {
							"service": {
								"required": true,
								"type": "object",
								"properties": {
									"serviceName": {
										"type": "string",
										"required": true,
										"pattern": /^[a-z0-9\-]+$/
									},
									"serviceVersion": {
										"type": "number",
										"required": true,
										"min": 1
									},
									"serviceGroup": {
										"type": "string",
										"required": true
									},
									"servicePort": {
										"type": "number",
										"required": true,
										"min": 4100
									},
									"requestTimeout": {
										"type": "number",
										"required": true
									},
									"requestTimeoutRenewal": {
										"type": "number",
										"required": true
									},
									"extKeyRequired": {
										"type": "boolean",
										"required": true
									},
									"urac": {
										"type": "boolean",
										"required": true
									},
									"urac_Profile": {
										"type": "boolean",
										"required": true
									},
									"urac_ACL": {
										"type": "boolean",
										"required": true
									},
									"provision_ACL": {
										"type": "boolean",
										"required": true
									},
									"session": {
										"type": "boolean",
										"required": false
									},
									"oauth": {
										"type": "boolean",
										"required": false
									},
									"dbs": {
										"type": "array",
										"required": false,
										"items": {
											"type": "object",
											"properties": {
												"prefix": { "type": "string" },
												"name": { "type": "string", "required": true },
												"multitenant": { "type": "boolean" }
											}
										},
										"minItems": 1,
										"uniqueItems": true
									}
								}
							},
							"yaml": {
								"type": "string",
								"required": true
							}
						}
					}
				}
			}
		},

		"put": {
			"/services/settings/update": {
				"_apiInfo": {
					"l": "Updates Service Settings",
					"group": "Services"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"version": {
					"source": ['body.version'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"settings": {
					"source": ['body.settings'],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},

			"/cd/ledger/read": {
				"_apiInfo": {
					"l": "Mark as read",
					"group": "Continuous Delivery"
				},
				"commonFields": ['project'],
				"data": {
					"required": true,
					"source": ["body.data"],
					"validation": {
						"oneOf": [
							{
								"type": "object",
								"properties": {
									"id": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									}
								}
							},
							{
								"type": "object",
								"properties": {
									"all": {
										'required': true,
										'validation': {
											'type': 'boolean'
										}
									}
								}
							},
						]
					}
				}
			},

			"/cd/action": {
				"_apiInfo": {
					"l": "Take Action",
					"group": "Continuous Delivery"
				},
				"commonFields": ['project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"data": {
					"required": true,
					"source": ["body.data"],
					"validation": {
						"oneOf": [
							{
								"type": "object",
								"additionalProperties": false,
								"properties": {
									"id": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"action": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
								}
							},
							{
								"type": "object",
								"properties": {
									"env": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"serviceName": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"serviceVersion": {
										'required': false,
										'validation': {
											'type': 'string'
										}
									},
									"id": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"action": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
								}
							},
							{
								"type": "object",
								"properties": {
									"env": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"action": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"mode": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"serviceId": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"serviceName": {
										'required': true,
										'validation': {
											'type': 'string'
										}
									},
									"serviceVersion": {
										'required': false,
										'validation': {
											'type': 'string'
										}
									}
								}
							}
						]
					}
				},
				"deployOptions": {
					'required': false,
					"source": ["body.deployOptions"],
					'validation': {
						'type': 'object'
					}
				}
			},

			"/environment/update": {
				_apiInfo: {
					"l": "Update Environment",
					"group": "Environment"
				},
				"commonFields": ['id', 'description', 'services', 'project'],
				"domain": {
					"source": ['body.domain'],
					"required": false,
					"validation": {
						"type": "string",
						"format": "hostname"
					}
				},
				"apiPrefix": {
					"source": ['body.apiPrefix'],
					"required": false,
					"default": "api",
					"validation": {
						"type": "string"
					}
				},
				"sitePrefix": {
					"source": ['body.sitePrefix'],
					"required": false,
					"default": "site",
					"validation": {
						"type": "string"
					}
				},
				"portalPrefix": {
					"source": ['body.portalPrefix'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"sensitive": {
					"source": ['body.sensitive'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				},
				"custom": {
					"source": ['body.custom'],
					"required": false,
					"validation": {
						"type": "object"
					}
				}
			},

			"/environment/key/update": {
				_apiInfo: {
					"l": "Update Environment Tenant Key Security",
					"group": "Environment"
				},
				"commonFields": ['id', 'project'],
				"algorithm": {
					"source": ['body.algorithm'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"password": {
					"source": ['body.password'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/environment/dbs/update": {
				_apiInfo: {
					"l": "Update Environment Database",
					"group": "Environment Databases"
				},
				"commonFields": ['project', 'env'],
				"prefix": {
					"source": ['body.prefix'],
					"required": false,
					"validation": { "type": "string", "required": false }
				},
				"name": {
					"source": ['body.name'],
					"required": true,
					"validation": { "type": "string", "required": true }
				},
				"cluster": {
					"source": ['body.cluster'],
					"required": true,
					"validation": { "type": "string", "required": true }
				},
				"tenantSpecific": {
					"source": ['body.tenantSpecific'],
					"required": false,
					"validation": { "type": "boolean", "required": true }
				},
				"sessionInfo": {
					"source": ['body.sessionInfo'],
					"required": false,
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"store": { "type": "object", "required": true },
							"dbName": { "type": "string", "required": true },
							"expireAfter": { "type": "integer", "required": true },
							"collection": { "type": "string", "required": true },
							"stringify": { "type": "boolean", "required": true }
						}
					}
				}
			},

			"/environment/dbs/updatePrefix": {
				_apiInfo: {
					"l": "Update Environment Databases Prefix",
					"group": "Environment Databases"
				},
				"commonFields": ['project', 'env'],
				"prefix": {
					"source": ['body.prefix'],
					"required": false,
					"validation": { "type": "string", "required": false }
				}
			},

			"/resources/update": {
				_apiInfo: {
					"l": "Update Resource",
					"group": "Resources"
				},
				"commonFields": ['project', 'env'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"resource": resourceSchema
			},

			"/resources/config/update": {
				_apiInfo: {
					"l": "Set Resource Deploy Configuration",
					"group": "Resources"
				},
				"commonFields": ['project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"resourceName": {
					"source": ['body.resourceName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"config": {
					"source": ['body.config'],
					"required": true,
					"validation": {
						"type": "object",
						"default": {},
						"properties": {
							"deploy": { "type": "boolean", "required": true },
							"options": {
								"type": "object",
								"required": false,
								"properties": resourceDeployConfigSchema
							}
						}
					}
				}
			},

			"/customRegistry/update": {
				_apiInfo: {
					"l": "Update Custom Registry Entry",
					"group": "Custom Registry"
				},
				"commonFields": ['project', 'env'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"customRegEntry": customRegEntrySchema
			},

			"/customRegistry/upgrade": {
				_apiInfo: {
					"l": "Upgrade To New Custom Registry",
					"group": "Custom Registry"
				},
				"commonFields": ['project', 'env']
			},

			"/environment/platforms/cert/choose": {
				_apiInfo: {
					"l": "Choose Existing Certificates",
					"group": "Environment Platforms"
				},
				"commonFields": ['project', 'env'],
				"platform": {
					"source": ['query.platform'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"driverName": {
					"source": ['query.driverName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"certIds": {
					"source": ['body.certIds'],
					"required": true,
					"validation": {
						"type": "array"
					}
				}
			},

			"/environment/platforms/driver/changeSelected": {
				_apiInfo: {
					"l": "Change Selected Driver",
					"group": "Environment Platforms"
				},
				"commonFields": ['project', 'env'],
				"selected": {
					"source": ['body.selected'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/environment/platforms/deployer/type/change": {
				_apiInfo: {
					"l": "Change Deployer Type",
					"group": "Environment Platforms"
				},
				"commonFields": ['project', 'env'],
				"deployerType": {
					"source": ['body.deployerType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["manual", "container"]
					}
				}
			},

			"/environment/platforms/deployer/update": {
				_apiInfo: {
					"l": "Change Deployer Type",
					"group": "Environment Platforms"
				},
				"commonFields": ['project', 'env'],
				"driver": {
					"source": ['body.driver'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ['local', 'remote']
					}
				},
				"config": {
					"source": ['body.config'],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},

			"/product/update": {
				_apiInfo: {
					"l": "Update Product",
					"group": "Product"
				},
				"commonFields": ['id', 'name', 'description', 'project']
			},

			"/product/packages/update": {
				_apiInfo: {
					"l": "Update Product Package",
					"group": "Product"
				},
				"commonFields": ['id', 'name', 'description', '_TTL', 'acl', 'project'],
				"code": {
					"source": ["query.code"],
					"required": true,
					"validation": {
						"type": "string",
						"format": "alphanumeric"
					}
				}
			},

			"/tenant/update": {
				_apiInfo: {
					"l": "Update Tenant",
					"group": "Tenant"
				},
				"commonFields": ['id', 'name', 'description', 'project'],
				"type": {
					"source": ['body.type'],
					"required": false,
					"default": "client",
					"validation": {
						"type": "string",
						"enum": ["admin", "product", "client", 'project']
					}
				},
				"tag": {
					"source": ['body.tag'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/tenant/oauth/update": {
				_apiInfo: {
					"l": "Update Tenant oAuth Configuration",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'secret', 'redirectURI', 'oauthType', 'availableEnv', 'project']
			},

			"/tenant/oauth/users/update": {
				_apiInfo: {
					"l": "Update Tenant oAuth User",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'uId', 'project'],
				"userId": {
					"source": ['body.userId'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"password": {
					"source": ['body.password'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/tenant/application/update": {
				_apiInfo: {
					"l": "Update Tenant Application",
					"group": "Tenant Application"
				},
				"_TTL": {
					"source": ['body._TTL'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ['6', '12', '24', '48', '72', '96', '120', '144', '168']
					}
				},
				"commonFields": ['project', 'id', 'appId', 'description', 'acl', 'productCode', 'packageCode', 'clearAcl']
			},

			"/tenant/application/key/ext/update": {
				_apiInfo: {
					"l": "Update Tenant Application External Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'extKey', 'expDate', 'device', 'geo', 'project'],
				"extKeyEnv": {
					"source": ['query.extKeyEnv'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/tenant/application/key/config/update": {
				_apiInfo: {
					"l": "Update Tenant Application Key Configuration",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'envCode', 'config', 'project']
			},

			"/settings/tenant/update": {
				_apiInfo: {
					"l": "Update Tenant",
					"group": "Tenant Settings"
				},
				"commonFields": ['name', 'description', 'project'],
				"type": {
					"source": ['body.type'],
					"required": false,
					"default": "client",
					"validation": {
						"type": "string",
						"enum": ["admin", "product", "client"]
					}
				}
			},

			"/settings/tenant/oauth/update": {
				_apiInfo: {
					"l": "Update Tenant oAuth Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['secret', 'redirectURI', 'oauthType', 'availableEnv', 'project']
			},

			"/settings/tenant/oauth/users/update": {
				_apiInfo: {
					"l": "Update Tenant oAuth User",
					"group": "Tenant Settings"
				},
				"commonFields": ['uId', 'project'],
				"userId": {
					"source": ['body.userId'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"password": {
					"source": ['body.password'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/settings/tenant/application/key/ext/update": {
				_apiInfo: {
					"l": "Update Tenant Application External Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'extKey', 'expDate', 'device', 'geo', 'project'],
				"extKeyEnv": {
					"source": ['query.extKeyEnv'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/settings/tenant/application/key/config/update": {
				_apiInfo: {
					"l": "Update Tenant Application Key Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'envCode', 'config', 'project']
			},

			"/daemons/groupConfig/update": {
				_apiInfo: {
					"l": "Update Daemon Group Configuration",
					"group": "Daemons"
				},
				'commonFields': ['project', 'id', 'groupName', 'daemon', 'cronTime', 'cronTimeDate', 'timeZone', 'interval', 'status', 'processing', 'jobs', 'order', 'solo'],
				'type': {
					"required": true,
					"source": ["body.type"],
					"validation": {
						"type": "string",
						"enum": ["interval", "cron", "once"]
					}
				}
			},

			"/daemons/groupConfig/serviceConfig/update": {
				_apiInfo: {
					"l": "Update Service Configuration",
					"group": "Daemons"
				},
				'commonFields': ['id', 'jobName', 'project'],
				'env': {
					'source': ['body.env'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'config': {
					'source': ['body.config'],
					'required': true,
					'validation': {
						'type': 'object'
					}
				}
			},

			"/daemons/groupConfig/tenantExtKeys/update": {
				_apiInfo: {
					"l": "Update Job's External Keys",
					"group": "Daemons"
				},
				'commonFields': ['id', 'jobName', 'project'],
				'tenantExtKeys': {
					'source': ['body.tenantExtKeys'],
					'required': true,
					'validation': {
						'type': 'array'
					}
				},
				'tenantsInfo': {
					'source': ['body.tenantsInfo'],
					'required': true,
					'validation': {
						'type': 'array'
					}
				}
			},

			"/cloud/nodes/update": {
				"_apiInfo": {
					"l": "Update HA Cloud Node",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env'],
				"nodeId": {
					"source": ['query.nodeId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"type": {
					"source": ['body.type'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["role", "availability"]
					}
				},
				"value": {
					"source": ['body.value'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/cloud/nodes/tag": {
				"_apiInfo": {
					"l": "Update HA Cloud Node Tag",
					"group": "HA Cloud"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['body.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"tag": {
					"source": ['body.tag'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/cloud/services/scale": {
				"_apiInfo": {
					"l": "Scale HA Service",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'namespace'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"serviceId": {
					"source": ['body.serviceId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"scale": {
					"source": ['body.scale'],
					"required": true,
					"validation": {
						"type": "number"
					}
				}
			},

			"/cloud/services/redeploy": {
				"_apiInfo": {
					"l": "Redeploy HA Service",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'namespace'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"serviceId": {
					"source": ['body.serviceId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"mode": {
					"source": ['body.mode'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"action": {
					"source": ['body.action'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ['redeploy', 'rebuild']
					}
				},
				"custom": {
					"source": ["body.custom"],
					"required": false,
					"validation": {
						"type": "object",
						"required": false,
						"properties": {
							"branch": { "type": "string", "required": false },
							"commit": { "type": "string", "required": false },
							"memory": { "type": "number", "required": false, "minimum": 500 },
							"image": {
								"type": "object",
								"required": false,
								"properties": {
									"prefix": { "required": false, "type": "string" },
									"name": { "required": false, "type": "string" },
									"tag": { "required": false, "type": "string" },
								}
							},
							"env": {
								"type": "object",
								"required": false,
								"additionalProperties": { "type": "string" }
							}
						}
					}
				}
			},

			"/cloud/services/autoscale": {
				"_apiInfo": {
					"l": "Autoscale Services",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env', 'namespace'],
				"action": {
					"source": ['body.action'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["update", "turnOff"]
					}
				},
				"autoscaler": {
					"source": ['body.autoscaler'],
					"required": false,
					"validation": {
						"type": "object",
						"properties": {
							"replicas": {
								"type": "object",
								"properties": {
									"min": { "type": "number", "required": true },
									"max": { "type": "number", "required": true }
								}
							},
							"metrics": { "type": "object", "required": true }
						}
					}
				},
				"services": {
					"source": ['body.services'],
					"required": true,
					"validation": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"id": { "type": "string", "required": true },
								"type": { "type": "string", "required": true, "enum": ["deployment"] }
							}
						}
					}
				}
			},

			"/cloud/services/autoscale/config": {
				"_apiInfo": {
					"l": "Configure Environment Autoscaling",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env'],
				"autoscale": {
					"source": ['body.autoscale'],
					"required": true,
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"replicas": {
								"type": "object",
								"properties": {
									"min": { "type": "number", "required": true },
									"max": { "type": "number", "required": true }
								}
							},
							"metrics": {
								"type": "object",
								"required": true,
								"properties": {
									//NOTE: only CPU metrics are supported for now
									"cpu": {
										"type": "object",
										"properties": {
											"percent": { "type": "number", "required": true }
										}
									}
								}
							}
						}
					}
				}
			},

			"/catalog/recipes/update": {
				"_apiInfo": {
					"l": "Update Catalog",
					"group": "Catalog"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"catalog": catalogSchema
			},

			"/gitAccounts/repo/sync": {
				"_apiInfo": {
					"l": "Deactivate Repository",
					"group": "Git Accounts"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['body.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"project": {
					"source": ['body.project'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"owner": {
					"source": ['body.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"repo": {
					"source": ['body.repo'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/ci/provider": {
				"_apiInfo": {
					"l": "Deactivate CI Provider",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				"owner": {
					"source": ['body.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['body.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/ci/recipe": {
				"_apiInfo": {
					"l": "Edit CI Recipe",
					"group": "Continuous Integration"
				},
				"commonFields": ["id", 'project'],
				"provider": {
					"source": ['body.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"name": {
					"source": ['body.name'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"recipe": {
					"source": ['body.recipe'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/ci/settings": {
				"_apiInfo": {
					"l": "Update CI Repository Settings",
					"group": "Continuous Integration"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'provider': {
					'source': ['query.provider'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'owner': {
					'source': ['query.owner'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'port': {
					'source': ['body.port'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				"settings": {
					"source": ['body.settings'],
					"required": false,
					"validation": {
						"type": "object"
					}
				},
				"variables": {
					"source": ['body.variables'],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},

			"/gitAccounts/repo/deactivate": {
				"_apiInfo": {
					"l": "Deactivate Repository",
					"group": "Git Accounts"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"owner": {
					"source": ['query.owner'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"repo": {
					"source": ['query.repo'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			}
		},

        "delete": {
            "/environment/delete": {
                _apiInfo: {
                    "l": "Delete Environment",
                    "group": "Environment"
                },
                "commonFields": ['id', 'project'],
	            "force": {
		            "source": ['query.force'],
		            "required": true, "default": false,
		            "validation": {"type": "boolean"}
	            }
            },

			"/environment/dbs/delete": {
				_apiInfo: {
					"l": "Delete Environment Database",
					"group": "Environment Databases"
				},
				"commonFields": ['project', 'env'],
				"name": {
					"source": ['query.name'],
					"required": true,
					"validation": { "type": "string", "required": true }
				}
			},

			"/resources/delete": {
				_apiInfo: {
					"l": "Delete a resource",
					"group": "Resources"
				},
				"commonFields": ['project', 'env'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/customRegistry/delete": {
				_apiInfo: {
					"l": "Delete A Custom Registry Entry",
					"group": "Custom Registry"
				},
				"commonFields": ['project', 'env'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/environment/platforms/cert/delete": {
				_apiInfo: {
					"l": "Remove Certificate",
					"group": "Environment Platforms"
				},
				"commonFields": ['project', 'env'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"driverName": {
					"source": ['query.driverName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/product/delete": {
				_apiInfo: {
					"l": "Delete Product",
					"group": "Product"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"code": {
					"source": ['query.code'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/product/packages/delete": {
				_apiInfo: {
					"l": "Delete Product Package",
					"group": "Product"
				},
				"commonFields": ['id', 'project'],
				"code": {
					"source": ['query.code'],
					"required": true,
					"validation": {
						"type": "string",
						"format": "alphanumeric"
					}
				}
			},

			"/tenant/delete": {
				_apiInfo: {
					"l": "Delete Tenant",
					"group": "Tenant"
				},
				"commonFields": ['project'],
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"code": {
					"source": ['query.code'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},

			"/tenant/oauth/delete": {
				_apiInfo: {
					"l": "Delete Tenant oAuth Configuration",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'project']
			},

			"/tenant/oauth/users/delete": {
				_apiInfo: {
					"l": "Delete Tenant oAuth User",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'uId', 'project']
			},

			"/tenant/application/delete": {
				_apiInfo: {
					"l": "Delete Tenant Application",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'project']
			},

			"/tenant/application/key/delete": {
				_apiInfo: {
					"l": "Delete Tenant Application Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'project']
			},

			"/settings/tenant/oauth/delete": {
				_apiInfo: {
					"l": "Delete Tenant oAuth Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['project']
			},

			"/settings/tenant/oauth/users/delete": {
				_apiInfo: {
					"l": "Delete Tenant oAuth User",
					"group": "Tenant Settings"
				},
				"commonFields": ['uId', 'project']
			},

			"/settings/tenant/application/key/delete": {
				_apiInfo: {
					"l": "Delete Tenant Application Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'project']
			},

			"/daemons/groupConfig/delete": {
				_apiInfo: {
					"l": "Delete Daemon Group Configuration",
					"group": "Daemons"
				},
				'commonFields': ['id', 'project']
			},

			"/cloud/nodes/remove": {
				"_apiInfo": {
					"l": "Remove HA Cloud Node",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env'],
				"nodeId": {
					"source": ['query.nodeId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/cloud/services/delete": {
				"_apiInfo": {
					"l": "Delete HA Service",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env', 'namespace'],
				"serviceId": {
					"source": ['query.serviceId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"mode": {
					"source": ['query.mode'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/cloud/namespaces/delete": {
				"_apiInfo": {
					"l": "Delete a Namespace",
					"group": "HA Cloud"
				},
				'commonFields': ['project', 'env'],
				"namespaceId": {
					"source": ['query.namespaceId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},

			"/catalog/recipes/delete": {
				"_apiInfo": {
					"l": "Delete a Catalog",
					"group": "Catalog"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'version': {
					"source": ['query.version'],
					"required": false,
					"validation": {
						"type": "number"
					}
				}
			},

			"/ci/recipe": {
				"_apiInfo": {
					"l": "Delete CI Recipe",
					"group": "Continuous Integration"
				},
				"commonFields": ["id", 'project']
			},

			"/gitAccounts/logout": {
				"_apiInfo": {
					"l": "Github Logout",
					"group": "Git Accounts"
				},
				'commonFields': ['project'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"provider": {
					"source": ['query.provider'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"username": {
					"source": ['query.username'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"password": {
					"source": ['query.password'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			}
		}
	}
};
