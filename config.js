'use strict';
var serviceConfig = require("./schemas/serviceConfig");

var aclSchema = require("./schemas/acl");
var catalogSchema = require("./schemas/catalog");
var resourceSchema = require("./schemas/resource");
var customRegEntrySchema = require("./schemas/customRegistry");
var resourceDeployConfigSchema = require("./schemas/resourceDeployConfig");
var environmentSchema = require("./schemas/environmentSchema");
var serviceSchema = require("./schemas/serviceSchema");
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
	
	"infraExtrasList": ['osDisks', 'dataDisks', 'loadBalancers', 'networks', 'publicIps', 'securityGroups', 'vmSizes', 'keyPairs', 'certificates', 'availabilityZones', 'roles'],
	"extrasFunctionMapping": {
		osDisks: {
			functionName: 'listDisks',
			schemaName: 'osDisk',
			specialInput: {type: 'os'}
		},
		dataDisks: {
			functionName: 'listDisks',
			schemaName: 'dataDisk',
			specialInput: {type: 'data'}
		},
		loadBalancers: {
			functionName: 'listLoadBalancers',
			schemaName: 'loadBalancer'
		},
		networks: {
			functionName: 'listNetworks',
			schemaName: 'network'
		},
		publicIps: {
			functionName: 'listPublicIps',
			schemaName: 'publicIp'
		},
		securityGroups: {
			functionName: 'listSecurityGroups',
			schemaName: 'securityGroup'
		},
		vmSizes: {
			functionName: 'listVmSizes',
			schemaName: 'vmSize',
			requiredInput: ['region']
		},
		keyPairs: {
			functionName: 'listKeyPairs',
			schemaName: 'keyPair'
		},
		certificates: {
			functionName: 'listCertificates',
			schemaName: 'certificate'
		},
		availabilityZones: {
			functionName: 'listAvailabilityZones',
			schemaName: 'availabilityZone'
		},
		roles: {
			functionName: 'listRoles',
			schemaName: 'roles'
		}
	},
	
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
			customConfigFilePath: "config.js",
			soajsConfigFilesPath: {
				"soajsFile": "soa.js",
				"soajsJSONFile": "soa.json",
				"swaggerFile": "swagger.yml",
				"swaggerJSONFile": "swagger.json"
			}
		},
		"bitbucket_enterprise": {
			userAgent: "SOAJS Bitbucket App",
			customConfigFilePath: "config.js",
			repoConfigsFolder: __dirname + '/repoConfigs',
			soajsConfigFilesPath: {
				"soajsFile": "soa.js",
				"soajsJSONFile": "soa.json",
				"swaggerFile": "swagger.yml",
				"swaggerJSONFile": "swagger.json"
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
			"customConfigFilePath": "config.js",
			"soajsConfigFilesPath": {
				"soajsJSONFile": "soa.json",
				"soajsFile": "soa.js",
				"swaggerFile": "swagger.yml",
				"swaggerJSONFile": "swagger.json"
			},
			"repoConfigsFolder": __dirname + '/repoConfigs'
		}
	},
	
	"console": {
		"product": "DSBRD"
	},
	
	"errors": require("./utils/errors"),
	
	"schema": {
		"commonFields": {
			"soajs_project": {
				"source": ['query.soajs_project'],
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
						"clusterType": {"type": "string"},
						"URLParam": {"type": "object", "properties": {}},
						"servers": {"type": "array", "items": {"type": "object", "required": true}},
						"extraParam": {"type": "object", "properties": {}},
						"streaming": {"type": "object", "properties": {}},
						"credentials": {
							"type": "object",
							"properties": {
								"username": {"type": "string"},
								"password": {"type": "string"}
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
								"maxPoolSize": {"type": "integer", "required": true},
								"authorization": {"type": "boolean", "required": true},
								"requestTimeout": {"type": "integer", "required": true, "min": 20, "max": 60},
								"requestTimeoutRenewal": {"type": "integer", "required": true, "min": 0}
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
						"type": {"required": true, "type": "string", "enum": ['manual', 'container']},
						"selected": {"type": "string", "required": false},
						"docker": {
							"type": "object",
							"required": false,
							"properties": {
								"selected": {"type": "string", "required": false},
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
				"validation": {"type": "boolean"}
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
				"validation": {"type": "integer", "min": 0}
			},
			"requestTimeoutRenewal": {
				"source": ['body.requestTimeoutRenewal'],
				"required": true,
				"validation": {"type": "integer", "min": 0}
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
							"l": {"type": "string", "required": true},
							"v": {"type": "string", "required": true},
							"group": {"type": "string", "required": true},
							"groupMain": {"type": "boolean", "required": false}
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
					'items': {'type': 'string'}
				}
			},
			"env": {
				'source': ['query.env', 'body.env'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			"namespace": {
				'source': ['query.namespace', 'body.namespace'],
				'required': false,
				'validation': {
					'type': 'string'
				}
			},
			"infraId": {
				'source': ['query.infraId', 'body.infraId'],
				'required': false,
				'validation': {
					'type': 'string'
				}
			},
			"mode": {
				'source': ['query.mode', 'body.mode'],
				'required': false,
				'validation': {
					'type': 'string'
				}
			},
			"serviceId": {
				"source": ['query.serviceId', 'body.serviceId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"technology": {
				"source": ['query.technology', 'body.technology'],
				"required": false,
				"validation": {
					"type": "string"
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
				"commonFields": ['soajs_project', 'env']
			},
			
			"/environment": {
				_apiInfo: {
					"l": "Get Environment",
					"group": "Environment"
				},
				"commonFields": ['soajs_project'],
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
			
			"/templates": {
				_apiInfo: {
					"l": "Get Templates",
					"group": "Templates"
				},
				"commonFields": ['soajs_project'],
				"fullList": {
					"required": false,
					"default": false,
					"source": ["query.fullList"],
					"validation": {
						"type": "boolean"
					}
				}
			},
			
			"/templates/upgrade": {
				_apiInfo: {
					"l": "Upgrade Old Templates",
					"group": "Templates"
				},
				"commonFields": ['soajs_project']
			},
			
			"/environment/status": {
				_apiInfo: {
					"l": "Get/Set Environment Deployment Status",
					"group": "Environment"
				},
				"commonFields": ['soajs_project'],
				"code": {
					"required": false,
					"source": ["query.code"],
					"validation": {
						"type": "string"
					}
				},
				'rollback': {
					"required": false,
					"source": ["query.rollback"],
					"validation": {
						"type": "number"
					}
				},
				'activate': {
					"required": false,
					"source": ["query.activate"],
					"validation": {
						"type": "boolean"
					}
				},
				'resume': {
					"required": false,
					"source": ["query.resume"],
					"validation": {
						"type": "boolean"
					}
				},
				'id': {
					"required": false,
					"source": ["query.id"],
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
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project']
			},
			
			"/environment/dbs/list": {
				_apiInfo: {
					"l": "List Environment Databases",
					"group": "Environment Databases"
				},
				"commonFields": ['soajs_project', 'env']
			},
			
			"/resources": {
				_apiInfo: {
					"l": "List Available Resources",
					"group": "Resources",
					"groupMain": true
				},
				"commonFields": ['soajs_project', 'env'],
				"envType": {
					"source": ['query.envType'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/resources/get": {
				_apiInfo: {
					"l": "Get One Resource",
					"group": "Resources"
				},
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project', 'env']
			},
			
			"/resources/config": {
				_apiInfo: {
					"l": "Get Resources Deploy Configuration",
					"group": "Resources"
				},
				"commonFields": ['soajs_project']
			},
			
			"/customRegistry/list": {
				_apiInfo: {
					"l": "List Custom Registry Entries",
					"group": "Custom Registry",
					"groupMain": true
				},
				"commonFields": ['soajs_project', 'env'],
				"start": {
					"source": ['query.start'],
					"required": false,
					"validation": {
						"type": "number",
						"minimum": 0
					}
				},
				"end": {
					"source": ['query.end'],
					"required": false,
					"validation": {
						"type": "number",
						"minimum": 1
					}
				}
			},
			
			"/customRegistry/get": {
				_apiInfo: {
					"l": "Get Custom Registry Entry",
					"group": "Custom Registry"
				},
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project', 'env']
			},
			
			"/product/list": {
				_apiInfo: {
					"l": "List Products",
					"group": "Product",
					"groupMain": true
				},
				"commonFields": ['soajs_project']
			},
			
			"/console/product/list": {
				_apiInfo: {
					"l": "List Console Products",
					"group": "Console Product"
				},
				"commonFields": ['soajs_project']
			},
			
			"/product/get": {
				_apiInfo: {
					"l": "Get Product",
					"group": "Product"
				},
				"commonFields": ['soajs_project'],
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
			
			"/product/purge": {
				_apiInfo: {
					"l": "Purge Product",
					"group": "Product"
				},
				"commonFields": ['id', 'description', 'soajs_project']
			},
			
			"/product/packages/list": {
				_apiInfo: {
					"l": "List Product Packages",
					"group": "Product"
				},
				"commonFields": ['id', 'soajs_project']
			},
			
			"/product/packages/get": {
				_apiInfo: {
					"l": "Get Product Package",
					"group": "Product"
				},
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project'],
				"envCode": {
					"source": ["query.envCode"],
					"required": false,
					"validation": {
						"type": "string",
						"format": "alphanumeric"
					}
				}
			},
			
			"/tenant/list": {
				_apiInfo: {
					"l": "List Tenants",
					"group": "Tenant"
				},
				"commonFields": ['soajs_project'],
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
			
			"/console/tenant/list": {
				_apiInfo: {
					"l": "List Console Tenants",
					"group": "Console Tenant"
				},
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project'],
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
				"commonFields": ['id', 'soajs_project']
			},
			
			"/tenant/oauth/users/list": {
				_apiInfo: {
					"l": "List Tenant oAuth Users",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'soajs_project']
			},
			
			"/tenant/application/list": {
				_apiInfo: {
					"l": "List Tenant Applications",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'soajs_project']
			},
			
			"/tenant/application/key/list": {
				_apiInfo: {
					"l": "List Tenant Application Keys",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'soajs_project']
			},
			
			"/tenant/application/key/ext/list": {
				_apiInfo: {
					"l": "List Tenant Application External Keys",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'soajs_project']
			},
			
			"/tenant/application/key/config/list": {
				_apiInfo: {
					"l": "List Tenant Application Key Configuration",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'soajs_project']
			},
			
			"/tenant/db/keys/list": {
				_apiInfo: {
					"l": "List Dashboard Tenant Keys",
					"group": "Dashboard Tenants"
				},
				"commonFields": ['soajs_project']
			},
			
			"/settings/tenant/get": {
				_apiInfo: {
					"l": "Get Tenant",
					"group": "Tenant Settings"
				},
				"commonFields": ['soajs_project']
			},
			
			"/settings/tenant/oauth/list": {
				_apiInfo: {
					"l": "Get Tenant oAuth Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['soajs_project']
			},
			
			"/settings/tenant/oauth/users/list": {
				_apiInfo: {
					"l": "List Tenant oAuth Users",
					"group": "Tenant Settings"
				},
				"commonFields": ['soajs_project']
			},
			
			"/settings/tenant/application/list": {
				_apiInfo: {
					"l": "List Tenant Applications",
					"group": "Tenant Settings"
				},
				"commonFields": ['soajs_project']
			},
			
			"/settings/tenant/application/key/list": {
				_apiInfo: {
					"l": "List Tenant Application Keys",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'soajs_project']
			},
			
			"/settings/tenant/application/key/ext/list": {
				_apiInfo: {
					"l": "List Tenant Application External Keys",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'soajs_project']
			},
			
			"/settings/tenant/application/key/config/list": {
				_apiInfo: {
					"l": "List Tenant Application Key Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'soajs_project']
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
				"commonFields": ['soajs_project'],
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
			
			"/services/favorite": {
				"_apiInfo": {
					"l": "Add Service to Favorites",
					"group": "Services"
				},
				"commonFields": ['soajs_project'],
				'service': {
					'source': ['query.service'],
					'required': true,
					"validation": {
						"type": "string"
					}
				},
				'type': {
					'source': ['query.type'],
					'required': true,
					"validation": {
						"enum": ['apiCatalog'],
						"type": "string"
					}
				}
			},
			"/services/favorite/list": {
				"_apiInfo": {
					"l": "Delete Service from Favorites",
					"group": "Services"
				},
				"commonFields": ['soajs_project'],
				'username': {
					'source': ['query.username'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'type': {
					'source': ['query.type'],
					'required': true,
					"validation": {
						"enum": ['apiCatalog'],
						"type": "string"
					}
				}
			},
			
			"/daemons/groupConfig/serviceConfig/list": {
				_apiInfo: {
					"l": "List Service Configuration",
					"group": "Daemons"
				},
				'commonFields': ['id', 'jobName', 'soajs_project']
			},
			
			"/daemons/groupConfig/tenantExtKeys/list": {
				_apiInfo: {
					"l": "List Job's External Keys",
					"group": "Daemons"
				},
				'commonFields': ['id', 'jobName', 'soajs_project']
			},
			
			"/hosts/list": {
				_apiInfo: {
					"l": "List Hosts",
					"group": "Hosts",
					"groupMain": true
				},
				'commonFields': ['soajs_project', 'env']
			},
			
			"/hosts/awareness": {
				"_apiInfo": {
					"l": "Get Controller Hosts",
					"group": "Hosts"
				},
				"commonFields": ['soajs_project', 'env']
			},
			
			"/hosts/maintenance": {
				"_apiInfo": {
					"l": "Execute Maintenance Operation on Hosts",
					"group": "Hosts"
				},
				"commonFields": ['soajs_project', 'env'],
				"serviceName": {
					"source": ['query.serviceName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"serviceType": {
					"source": ['query.serviceType'],
					"required": false,
					"default": 1,
					"validation": {
						"type": "string",
						"enum": ['service', 'daemon']
					}
				},
				"serviceVersion": {
					"source": ['query.serviceVersion'],
					"required": false,
					"default": "1",
					"validation": {
						"type": "string"
					}
				},
				"operation": {
					"source": ['query.operation'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"portType": {
					"source": ['query.portType'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ["inherit", "custom", "maintenance"]
					}
				},
				"portValue": {
					"source": ['query.portValue'],
					"required": false,
					"validation": {
						"type": "number"
					}
				},
			},
			
			"/cloud/services/list": {
				"_apiInfo": {
					"l": "List Cloud Services",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env']
			},
			
			"/cloud/nodes/list": {
				"_apiInfo": {
					"l": "List HA Cloud Nodes",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env']
			},
			
			"/cloud/services/instances/logs": {
				"_apiInfo": {
					"l": "Get Service Container Logs",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env', 'namespace', 'serviceId', 'infraId', 'technology'],
				"taskId": {
					"source": ['query.taskId'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				'filter': {
					"source": ['body.filter'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ["heartbeat", "reloadRegistry", "loadProvision", "awarenessStat", 'infoHost', 'daemonStats', 'reloadDaemonConf']
					}
				},
				"follow": {
					"source": ['query.follow'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				}
			},
			
			"/cloud/namespaces/list": {
				"_apiInfo": {
					"l": "List Available Namespaces",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env']
			},
			
			"/cloud/resource": {
				"_apiInfo": {
					"l": "Check if resource is Deployed",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env'],
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
			
			"/cloud/vm/list": {
				"_apiInfo": {
					"l": "List Cloud Virtual Machines",
					"group": "Services"
				},
				'commonFields': ['soajs_project'],
				"includeErrors": {
					"source": ['query.includeErrors'],
					"required": true,
					"default": false,
					"validation": {
						"type": "boolean"
					}
				},
				"env": {
					"source": ['query.env'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"group": {
					"source": ['query.group'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"infraId": {
					"source": ['query.infraId'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/cloud/vm/layer/status": {
				"_apiInfo": {
					"l": "List Cloud Virtual Machines",
					"group": "Services"
				},
				'commonFields': ['soajs_project', 'env', 'id'],
				"layerName": {
					"source": ['query.layerName'],
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
				'commonFields': ['soajs_project', 'env']
			},
			
			"/cloud/metrics/nodes": {
				"_apiInfo": {
					"l": "List Nodes Metrics",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env']
			},
			
			"/catalog/recipes/list": {
				"_apiInfo": {
					"l": "List Catalog Recipes",
					"group": "Catalog"
				},
				'commonFields': ['soajs_project'],
				'version': {
					"source": ['query.version'],
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
				'commonFields': ['soajs_project'],
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
						"type": "number",
						"minimum": 1
					}
				}
			},
			
			"/catalog/recipes/upgrade": {
				"_apiInfo": {
					"l": "Upgrade Catalog Recipes to latest Version",
					"group": "Catalog"
				},
				'commonFields': ['soajs_project']
			},
			
			"/cd": {
				"_apiInfo": {
					"l": "Get CD Configuration",
					"group": "Continuous Delivery"
				},
				'commonFields': ['soajs_project']
			},
			
			"/cd/updates": {
				"_apiInfo": {
					"l": "Get Update Notification Ledger",
					"group": "Continuous Delivery"
				},
				'commonFields': ['soajs_project', 'env']
			},
			
			"/ci": {
				"_apiInfo": {
					"l": "Get CI Accounts",
					"group": "Continuous Integration"
				},
				'commonFields': ['soajs_project'],
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
				'commonFields': ['soajs_project'],
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
				"commonFields": ["id", 'soajs_project']
			},
			
			"/ci/script/download": {
				"_apiInfo": {
					"l": "Download CI Script",
					"group": "Continuous Integration"
				},
				'commonFields': ['soajs_project'],
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
				'commonFields': ['soajs_project'],
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
				'commonFields': ['soajs_project'],
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
				'commonFields': ['soajs_project'],
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
			
			"/ci/repo/builds": {
				"_apiInfo": {
					"l": "Get the CI Latest Repository Build Per Branch",
					"group": "Continuous Integration"
				},
				'commonFields': ['soajs_project'],
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
				'commonFields': ['soajs_project'],
				"fullList": {
					"source": ['query.fullList'],
					"required": false,
					"default": false,
					"validation": {
						"type": "boolean"
					}
				},
				"rms": {
					"source": ['query.rms'],
					"required": false,
					"default": false,
					"validation": {
						"type": "boolean"
					}
				},
				"type": {
					"source": ['query.type'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
			},
			
			"/gitAccounts/getRepos": {
				"_apiInfo": {
					"l": "Get Repositories",
					"group": "Git Accounts"
				},
				'commonFields': ['soajs_project'],
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
				'commonFields': ['soajs_project'],
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
				},
				"version": {
					"source": ['query.version'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"serviceName": {
					"source": ['query.serviceName'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
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
				'commonFields': ['soajs_project', 'env'],
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
			},
			
			"/apiBuilder/list": {
				"_apiInfo": {
					"l": "List Endpoints",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				}
			},
			
			"/apiBuilder/get": {
				"_apiInfo": {
					"l": "Get Endpoint",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {"type": "string"}
				}
			},
			
			"/apiBuilder/publish": {
				"_apiInfo": {
					"l": "Publish endpoint apis",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "passThroughs"]
					}
				},
				"endpointId": {
					"source": ['query.endpointId'],
					"required": true,
					"validation": {"type": "string"}
				}
			},
			
			"/apiBuilder/getResources": {
				"_apiInfo": {
					"l": "Get Resources",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project']
			},
			
			"/secrets/list": {
				"_apiInfo": {
					"l": "List Available Secrets",
					"group": "Secrets"
				},
				'commonFields': ['soajs_project', 'namespace', 'env']
			},
			
			"/secrets/get": {
				"_apiInfo": {
					"l": "Get One Secret",
					"group": "Secrets"
				},
				'commonFields': ['soajs_project', 'namespace', 'env'],
				"name": {
					"source": ['query.name'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra": {
				"_apiInfo": {
					"l": "Get Infra Provider",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project'],
				"exclude": {
					"source": ['query.exclude'],
					"required": false,
					"validation": {
						"type": "array",
						"items": {
							"type": "string",
							"enum": ["regions", "templates", "groups", "extra"]
						},
						"uniqueItems": true,
						"minItems": 1
					}
				},
				"id": {
					"source": ['query.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"envCode": {
					"source": ['query.envCode'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"technology": {
					"source": ['query.technology'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"type": {
					"source": ['query.type'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ["cloud", "technology"]
					}
				}
			},
			
			"/infra/cluster": {
				"_apiInfo": {
					"l": "Get Cluster From Infra Provider",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"envCode": {
					"source": ['query.envCode'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra/template/download": {
				"_apiInfo": {
					"l": "Download Infra as Code Template",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"templateId": {
					"source": ['query.templateId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra/extras": {
				"_apiInfo": {
					"l": "Get Extra Compnents From An Infra Provider",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				'envCode': {
					"source": ['query.envCode'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				'group': {
					"source": ['query.group'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				'region': {
					"source": ['query.region'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				'extras': {
					"source": ['query.extras'],
					"required": false,
					"validation": {
						"type": "array",
						"items": {
							"type": "string",
							"enum": ['osDisks', 'dataDisks', 'loadBalancers', 'networks', 'publicIps', 'securityGroups', 'vmSizes', 'keyPairs', 'certificates', 'availabilityZones']
						},
						"minItems": 0,
						"uniqueItems": true
					}
				}
			}
			
		},
		
		"post": {
			
			"/hosts/start": {
				"_apiInfo": {
					"l": "Start Service Hosts",
					"group": "Hosts"
				},
				"commonFields": ['soajs_project', 'env'],
				"serviceName": {
					"source": ['body.serviceName'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["controller", "urac", "oauth"]
					}
				},
				"serviceVersion": {
					"source": ['body.serviceVersion'],
					"required": false,
					"default": "1",
					"validation": {
						"type": "string"
					}
				},
			},
			
			"/hosts/stop": {
				"_apiInfo": {
					"l": "Stop Service Hosts",
					"group": "Hosts"
				},
				"commonFields": ['soajs_project', 'env'],
				"serviceName": {
					"source": ['body.serviceName'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["controller", "urac", "oauth"]
					}
				},
				"serviceVersion": {
					"source": ['body.serviceVersion'],
					"required": false,
					"default": "1",
					"validation": {
						"type": "string"
					}
				},
			},
			
			"/templates/import": {
				_apiInfo: {
					"l": "Import Templates",
					"group": "Templates"
				},
				'commonFields': ['soajs_project'],
				"id": {
					"source": ['query.id', 'body.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"correction": {
					"source": ['body.correction'],
					"required": false,
					"validation": {
						"type": "object"
					}
				}
			},
			
			"/templates/export": {
				_apiInfo: {
					"l": "Export Templates",
					"group": "Templates"
				},
				'commonFields': ['soajs_project'],
				"ci": {
					"source": ['body.ci'],
					"required": false,
					"validation": {
						"type": "array",
						"uniqueItems": true,
						"items": {"type": "string", "required": true}
					}
				},
				"deployment": {
					"source": ['body.deployment'],
					"required": false,
					"validation": {
						"type": "array",
						"uniqueItems": true,
						"items": {"type": "string", "required": true}
					}
				},
				"endpoints": {
					"source": ['body.endpoints'],
					"required": false,
					"validation": {
						"type": "array",
						"uniqueItems": true,
						"items": {"type": "string", "required": true}
					}
				},
				"iac": {
					"source": ['body.iac'],
					"required": false,
					"validation": {
						"type": "array",
					}
				},
				"external": {
					"source": ['body.external'],
					"required": false,
					"validation": {
						"type": "object",
					}
				},
				"id": {
					"source": ['body.id'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/services/list": {
				_apiInfo: {
					"l": "List Services",
					"group": "Services"
				},
				'commonFields': ['soajs_project'],
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
						'items': {'type': 'string'}
					}
				}
			},
			
			"/environment/add": {
				_apiInfo: {
					"l": "Add Environment",
					"group": "Environment"
				},
				'commonFields': ['soajs_project'],
				"data": {
					"source": ['body.data'],
					"required": true,
					"validation": {
						"type": "object",
						"properties": environmentSchema,
						"additionalProperties": false
					}
				},
				"template": {
					"source": ['body.template'],
					"required": true,
					"validation": {
						"type": "object",
						"properties": {
							"deploy": {
								"type": "object",
								"properties": {
									"deploy": true
								}
							}
						}
					}
				}
			},
			
			"/environment/dbs/add": {
				_apiInfo: {
					"l": "Add Environment Database",
					"group": "Environment Databases"
				},
				'commonFields': ['soajs_project', 'env'],
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
					"validation": {"type": "string", "required": true}
				},
				"cluster": {
					"source": ['body.cluster'],
					"required": true,
					"validation": {"type": "string", "required": true}
				},
				"tenantSpecific": {
					"source": ['body.tenantSpecific'],
					"required": false,
					"validation": {"type": "boolean", "required": true}
				},
				"sessionInfo": {
					"source": ['body.sessionInfo'],
					"required": false,
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"store": {"type": "object", "required": true},
							"dbName": {"type": "string", "required": true},
							"expireAfter": {"type": "integer", "required": true},
							"collection": {"type": "string", "required": true},
							"stringify": {"type": "boolean", "required": true}
						}
					}
				}
			},
			
			"/environment/platforms/attach": {
				_apiInfo: {
					"l": "Attach Container Technology",
					"group": "Environment Platforms"
				},
				"commonFields": ['soajs_project'],
				'env': {
					'source': ['query.env'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'data': {
					'source': ['body.data'],
					'required': true,
					'validation': {
						'type': 'object',
						'properties': {
							"deployment": {
								'required': false,
								'type': 'object',
								'properties': {
									"selectedDriver": {
										'required': true,
										'type': 'string'
									},
									"previousEnvironment": {
										'required': false,
										'type': 'string'
									}
								}
							},
							"selectedInfraProvider": {
								'required': true,
								'type': 'object',
								'properties': {
									'_id': {
										'required': true,
										'type': 'string'
									},
									'name': {
										'required': true,
										'type': 'string'
									},
									'deploy': {
										'type': 'object',
										'required': false,
										'properties': {
											"technology": {
												'required': true,
												'type': 'string'
											}
										}
									}
								}
							}
						}
					}
				}
			},
			
			"/environment/infra/lock": {
				"_apiInfo": {
					"l": "Lock an environment to a Cloud Provider",
					"group": "Environment"
				},
				'commonFields': ['soajs_project'],
				'envCode': {
					"source": ['body.envCode'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'infraId': {
					"source": ['body.infraId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'region': {
					"source": ['body.region'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'network': {
					"source": ['body.network'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'extras': {
					"source": ['body.extras'],
					"required": false,
					"validation": {
						"type": "object",
						"additionalProperties": {
							"type": "string",
							"required": true
						}
					}
				}
			},
			
			"/resources": { // add new
				_apiInfo: {
					"l": "Add / Edit Resource",
					"group": "Resources"
				},
				'commonFields': ['soajs_project'],
				"id": {
					"source": ['query.id', 'body.id'],
					"required": true,
					"default": "new",
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
				"deployType": {
					"source": ['body.deployType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["save", "saveAndRebuild", "saveAndDeploy"]
					}
				},
				"resource": resourceSchema,
				
				// cicd stuff + resourceName
				"status": {
					"source": ['body.status'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"config": {
					"source": ['body.config'],
					"required": false,
					"validation": {
						"type": "object",
						"default": {},
						"properties": {
							"deploy": {"type": "boolean", "required": true},
							"options": {
								"type": "object",
								"required": false,
								"properties": resourceDeployConfigSchema
							}
						}
					}
				},
				
				// deploy: required: recipe, deployConfig
				"recipe": {
					"source": ['body.recipe'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"vms": {
					"source": ['body.vms'],
					"required": false,
					"validation": {
						"type": "array"
					}
				},
				"deployConfig": {
					"required": false,
					"source": ['body.deployConfig'],
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"memoryLimit": {"required": false, "type": "number", "default": 209715200},
							"cpuLimit": {"required": false, "type": "string"},
							"isKubernetes": {"required": false, "type": "boolean"}, //NOTE: only required in case of controller deployment
							"replication": {
								"required": false,
								"type": "object",
								"properties": {
									"mode": {
										"required": true,
										"type": "string",
										"enum": ['replicated', 'global', 'deployment', 'daemonset']
									},
									"replicas": {"required": false, "type": "number", "minimum": 1}
								}
							},
							"region": {"required": false, "type": "string"},
							"infra": {"required": false, "type": "string"},
							"type": {"required": false, "type": "string"},
							"vmConfiguration": {
								"required": false,
								"type": "object"
							},
						}
					}
				},
				"custom": {
					"source": ["body.custom"],
					"required": false,
					"validation": {
						"type": "object",
						"properties": {
							"sourceCode": {
								"type": "object",
								"required": false,
								"properties": {
									"custom": {
										"type": "object",
										"required": false,
										"properties": {
											"repo": {"type": "string", "required": true},
											"branch": {"type": "string", "required": true},
											"commit": {"type": "string", "required": false},
											"path": {"type": "string", "required": false}
										}
									}
								}
							},
							"image": {
								"type": "object",
								"required": false,
								"properties": {
									"prefix": {"required": false, "type": "string"},
									"name": {"required": false, "type": "string"},
									"tag": {"required": false, "type": "string"},
									"registrySecret": {"required": false, "type": "string"}
								}
							},
							"env": {
								"type": ["object", "null"],
								"required": false,
								"additionalProperties": {"type": "string"}
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
								"type": "string",
								"pattern": /[a-z0-9]{1,61}/
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
									"gcName": {"required": true, "type": "string"},
									"gcVersion": {"required": true, "type": "number", "minimum": 1}
								}
							},
							"secrets": {
								"type": "array",
								"required": false,
								"items": {
									"type": "object",
									"required": true,
									"properties": {
										"name": {"type": "string", "required": true},
										"type": {"type": "string", "required": false},
										"mountPath": {"type": "string", "required": true}
									}
								}
							},
							"ports": {
								"type": "array",
								"required": false,
								"uniqueItems": true,
								"items": {
									"type": "object",
									"required": true,
									"properties": {
										"name": {"type": "string", "required": true},
										"port": {"type": "number", "required": false, "min": 1, "max": 2766}
									}
								}
							}
						}
					}
				},
				
				// rebuild : required:  serviceId, mode, action
				"serviceId": {
					"source": ['body.serviceId'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"mode": {
					"source": ['body.mode'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"action": {
					"source": ['body.action'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ['redeploy', 'rebuild']
					}
				}
			},
			
			"/customRegistry/add": {
				_apiInfo: {
					"l": "Add New Custom Registry Entry",
					"group": "Custom Registry"
				},
				'commonFields': ['soajs_project'],
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"customRegEntry": customRegEntrySchema
			},
			
			"/product/add": {
				_apiInfo: {
					"l": "Add Product",
					"group": "Product"
				},
				"commonFields": ['description', 'name', 'soajs_project'],
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
				"commonFields": ['id', 'name', 'description', '_TTL', 'acl', 'soajs_project'],
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
				"commonFields": ['name', 'description', 'soajs_project'],
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
				},
				"console": {
					"source": ['body.console'],
					"required": false,
					"validation": {
						"type": "boolean"
					}
				},
			},
			
			"/tenant/oauth/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth Configuration",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'secret', 'redirectURI', 'oauthType', 'availableEnv', 'soajs_project']
			},
			
			"/tenant/oauth/users/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth User",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'userId', 'password', 'soajs_project']
			},
			
			"/tenant/application/add": {
				_apiInfo: {
					"l": "Add Tenant Application",
					"group": "Tenant Application"
				},
				"commonFields": ['id', '_TTL', 'description', 'acl', 'productCode', 'packageCode', 'soajs_project']
			},
			
			"/tenant/application/key/add": {
				_apiInfo: {
					"l": "Add Tenant Application Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'soajs_project']
			},
			
			"/tenant/application/key/ext/add": {
				_apiInfo: {
					"l": "Add Tenant Application External Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'expDate', 'device', 'geo', 'soajs_project'],
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
				}
			},
			
			"/tenant/application/key/ext/delete": { //TODO: should be delete, remove params passed in body and change its method
				_apiInfo: {
					"l": "Delete Tenant Application External Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'extKey', 'soajs_project'],
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
					"group": "Private Tenant ACL"
				},
				"commonFields": ['id', 'soajs_project']
			},
			
			"/settings/tenant/oauth/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['secret', 'redirectURI', 'oauthType', 'availableEnv', 'soajs_project']
			},
			
			"/settings/tenant/oauth/users/add": {
				_apiInfo: {
					"l": "Add Tenant oAuth User",
					"group": "Tenant Settings"
				},
				"commonFields": ['userId', 'password', 'soajs_project']
			},
			
			"/settings/tenant/application/key/add": {
				_apiInfo: {
					"l": "Add Tenant Application Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'soajs_project']
			},
			
			"/settings/tenant/application/key/ext/add": {
				_apiInfo: {
					"l": "Add Tenant Application External Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['soajs_project', 'appId', 'key', 'expDate', 'device', 'geo'],
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
				"commonFields": ['appId', 'key', 'extKey', 'soajs_project'],
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
				"commonFields": ['soajs_project'],
				'grpConfNames': {
					'source': ['body.grpConfNames'],
					'required': false,
					'validation': {
						'type': 'array',
						'items': {'type': 'string'}
					}
				}
			},
			
			"/daemons/groupConfig/add": {
				_apiInfo: {
					"l": "Add Daemon Group Configuration",
					"group": "Daemons"
				},
				'commonFields': ['soajs_project',
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
				"commonFields": ['soajs_project'],
				'daemonNames': {
					'source': ['body.daemonNames'],
					'required': false,
					'validation': {
						'type': 'array',
						'items': {'type': 'string'}
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
				"commonFields": ['soajs_project', 'infraId'],
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
						"properties": {
							"owner": {"required": true, "type": "string"},
							"repo": {"required": true, "type": "string"},
							"branch": {"required": true, "type": "string"},
							"commit": {"required": false, "type": "string"}
						}
					}
				},
				"deployConfig": {
					"required": true,
					"source": ['body.deployConfig'],
					"validation": {
						"type": "object",
						"properties": {
							"memoryLimit": {"required": false, "type": "number", "default": 209715200},
							"cpuLimit": {"required": false, "type": "string"},
							"isKubernetes": {"required": false, "type": "boolean"}, //NOTE: only required in case of controller deployment
							"replication": {
								"required": false,
								"type": "object",
								"properties": {
									"mode": {
										"required": true,
										"type": "string",
										"enum": ['replicated', 'global', 'deployment', 'daemonset']
									},
									"replicas": {"required": false, "type": "number", "minimum": 1}
								}
							},
							"region": {"required": false, "type": "string"},
							"infra": {"required": false, "type": "string"},
							"type": {"required": false, "type": "string"},
							"vmConfiguration": {
								"required": false,
								"type": "object",
								"properties": {
									"vmLayer": {"required": true, "type": "string"},
								}
							},
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
									"min": {"type": "number", "minimum": 1, "required": true},
									"max": {"type": "number", "minimum": 1, "required": true}
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
											"percent": {"type": "number", "minimum": 1, "required": true}
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
						"properties": {
							"sourceCode": {
								"type": "object",
								"required": false,
								"properties": {
									"custom": {
										"type": "object",
										"required": false,
										"properties": {
											"repo": {"type": "string", "required": true},
											"branch": {"type": "string", "required": true},
											"commit": {"type": "string", "required": false},
											"path": {"type": "string", "required": false}
										}
									}
								}
							},
							"image": {
								"type": "object",
								"required": false,
								"properties": {
									"prefix": {"required": false, "type": "string"},
									"name": {"required": false, "type": "string"},
									"tag": {"required": false, "type": "string"},
								}
							},
							"env": {
								"type": ["object", "null"],
								"required": false
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
								"type": "string",
								"pattern": /[a-z0-9]{1,61}/
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
									"gcName": {"required": true, "type": "string"},
									"gcVersion": {"required": true, "type": "number", "minimum": 1}
								}
							},
							"secrets": {
								"type": "array",
								"required": false,
								"items": {
									"type": "object",
									"required": true,
									"properties": {
										"name": {"type": "string", "required": true},
										"type": {"type": "string", "required": false},
										"mountPath": {"type": "string", "required": true}
									}
								}
							},
							"ports": {
								"type": "array",
								"required": false,
								"uniqueItems": true,
								"items": {
									"type": "object",
									"required": true,
									"properties": {
										"name": {"type": "string", "required": true},
										"port": {"type": "number", "required": false, "min": 1, "max": 2766}
									}
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
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project'],
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
						"type": "number",
						"minimum": 1
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
				"commonFields": ['soajs_project', 'namespace', 'env', 'serviceId', 'infraId', 'technology'],
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
			
			"/cloud/vm/maintenance": {
				"_apiInfo": {
					"l": "Perform A Maintenance Operation on a Virtual Machine",
					"group": "HA Cloud"
				},
				"commonFields": ['soajs_project', 'env'],
				"vmName": {
					"source": ['query.serviceId', 'body.serviceId'],
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
						"enum": ["powerOffVM", "startVM", "restartService"]
					}
				},
				'instanceId': {
					"source": ['query.instanceId'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/cloud/vm": {
				"_apiInfo": {
					"l": "Add Virtual Machine Layer",
					"group": "HA Cloud"
				},
				"commonFields": ['soajs_project', 'env'],
				"infraCodeTemplate": {
					"source": ['body.infraCodeTemplate'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"layerName": {
					"source": ['body.name'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"specs": {
					"source": ['body.specs'],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},
			
			"/cloud/vm/onboard": {
				"_apiInfo": {
					"l": "On-board Virtual Machine Layer",
					"group": "HA Cloud"
				},
				"commonFields": ['soajs_project', 'env'],
				"ids": {
					"source": ['body.ids'],
					"required": true,
					"validation": {
						"type": "array"
					}
				},
				"release": {
					"source": ['query.release'],
					"required": true,
					"validation": {
						"type": "boolean"
					}
				},
				"layerName": {
					"source": ['body.layerName'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/cloud/vm/logs": {
				"_apiInfo": {
					"l": "Get Service Container Logs",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project'],
				"technology": {
					"source": ['query.technology', 'body.vmName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"vmName": {
					"source": ['query.serviceId', 'body.serviceId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				'numberOfLines': {
					"source": ['query.numberOfLines', 'body.numberOfLines'],
					"required": false,
					"validation": {
						"type": "number",
						"min": 1,
						"max": 1000
					}
				},
				'env': {
					"source": ['query.env'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/catalog/recipes/add": {
				"_apiInfo": {
					"l": "Add New Catalog",
					"group": "Catalog"
				},
				"commonFields": ['soajs_project'],
				"catalog": catalogSchema
			},
			
			"/ci/provider": {
				"_apiInfo": {
					"l": "Activate CI Provider",
					"group": "Continuous Integration"
				},
				"commonFields": ['soajs_project'],
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
				},
				"variables": {
					"source": ['body.variables'],
					"required": false,
					"validation": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"name": {
									"type": "string", "required": true
								},
								"value": {
									"type": "string", "required": true
								}
							}
						}
					}
				}
			},
			
			"/ci/recipe": {
				"_apiInfo": {
					"l": "Add New CI Recipe",
					"group": "Continuous Integration"
				},
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project'],
				"config": {
					"source": ['body.config'],
					"required": false,
					"validation": {
						"type": "object",
						"properties": {
							"env": {"type": "string", "required": true},
							"serviceName": {"type": "string", "required": true},
							"default": {
								"type": "object",
								"properties": {
									"status": {"type": "string", "required": false},
									"branch": {"type": "string", "required": false, "minLengh": 1},
									"strategy": {"type": "string", "enum": ["notify", "update"], "required": false},
									"deploy": {"type": "boolean", "required": false},
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
									"v": {"type": "string", "required": true, "pattern": /v[0-9]*\.?[0-9]*$/},
									"branch": {"type": "string", "required": false, "minLengh": 1},
									"strategy": {"type": "string", "enum": ["notify", "update"], "required": false},
									"deploy": {"type": "boolean", "required": false},
									"status": {"type": "string", "required": false},
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
				"commonFields": ['soajs_project'],
				"config": {
					"source": ['body.config'],
					"required": false,
					"validation": {
						"type": "object",
						"properties": {
							"env": {"type": "string", "required": true},
							"pause": {"type": "boolean", "required": false}
						},
						"additionalProperties": false
					}
				}
			},
			
			"/cd/deploy": {
				"_apiInfo": {
					"l": "Trigger CD Deployment",
					"group": "Continuous Delivery Deployment"
				},
				"commonFields": ['soajs_project'],
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
								"serviceName": {
									"type": "string", "required": true
								},
								"serviceVersion": {
									"type": "string", "required": false
								}
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
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project'],
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
				},
				"git": {
					"source": ['body.git'],
					"required": true,
					"validation": {
						"type": "object",
						"properties": {
							"branches": {
								"type": "array",
								"required": true,
								"items": {
									"type": "object"
								}
							}
						}
					}
				}
			},
			
			"/swagger/simulate": {
				"_apiInfo": {
					"l": "Api simulation service",
					"group": "Simulate",
					"groupMain": true
				},
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project'],
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
										"type": "string",
										"required": true,
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
										"minimum": 1,
										"required": true
									},
									"requestTimeoutRenewal": {
										"type": "number",
										"minimum": 1,
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
												"prefix": {"type": "string"},
												"name": {"type": "string", "required": true},
												"multitenant": {"type": "boolean"}
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
			},
			
			"/swagger/generateExistingService": {
				"_apiInfo": {
					"l": "Regenerate Service via Swagger",
					"group": "swagger",
					"groupMain": true
				},
				"commonFields": ['soajs_project'],
				"id": {
					"required": true,
					"source": ["query.id", "body.id"],
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/apiBuilder/add": {
				"_apiInfo": {
					"l": "Add Endpoint",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType', 'body.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"src": {
					"source": ['body.src'],
					"required": false,
					"validation": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"provider": {
								"type": "string",
								"required": false,
								"default": "endpoint"
							},
							"urls": {
								"type": "array",
								"items": {
									"type": "object",
									"properties": {
										"version": {
											"type": "string",
											"required": true
										},
										"url": {
											"type": "string",
											"required": true
										}
									}
								}
							}
						}
					}
				},
				"port": {
					"required": false,
					"source": ['body.port'],
					"validation":{
						"type": "integer"
					}
				},
				"path": {
					"required": false,
					"source": ['body.path'],
					"validation":{
						"type": "string"
					}
				},
				"versions": {
					"required": false,
					"source": ['body.versions'],
					"validation":{
						"type": "object",
						"patternProperties": {
							'\\^\\(d\\+\\.\\)\\?\\(d\\+\\.\\)\\?\\(\\*\\|d\\+\\)\\$': {
								"type": "object",
								"properties": {
									"extKeyRequired": {
										"type": "boolean"
									},
									"oauth": {
										"type": "boolean"
									},
									"urac_Profile": {
										"type": "boolean"
									},
									"urac": {
										"type": "boolean"
									},
									"urac_ACL": {
										"type": "boolean"
									},
									"provision_ACL": {
										"type": "boolean"
									},
									"swagger": {
										"type": "boolean"
									},
									"acl": {
										"type": "boolean"
									},
									"url": {
										"type": "string"
									},
									"swaggerInput": {
										"type": "string"
									},
									"errors": {
										"oneOf": [
											{
												"type": "object",
												"required": false,
												"patternProperties": {
													"^[0-9]+$": {
														"type": "string",
														"required": true,
														"minLength": 5
													}
												}
											},
											{
												"type": "string",
												"required": false
											}
										]
									},
									"schema": {
										"oneOf": [
											{
												"type": "object",
												"required": true,
												"properties": {
													"commonFields": {
														"oneOf": [
															{
																"type": "string",
																"required": true,
																"pattern": "^/[^/]+(/[^/]+)*$"
															},
															{
																"type": "object",
																"additionalProperties": {
																	"type": "object",
																	"properties": {
																		"required": {
																			"type": "boolean",
																			"required": true
																		},
																		"source": {
																			"type": "array",
																			"minItems": 1,
																			"items": {
																				"type": "string"
																			},
																			"required": true
																		},
																		"validation": {
																			"oneOf": [
																				{
																					"type": "object",
																					"required": true,
																					"additionalProperties": true
																				},
																				{
																					"type": "string",
																					"required": true
																				}
																			]
																		}
																	}
																}
															}
														]
													},
													"patternProperties": {
														"oneOf": [
															{
																"^/[a-zA-Z0-9_.-]+$": {
																	"type": "object",
																	"properties": {
																		"method": {
																			"type": "string",
																			"required": false,
																			"enum": [
																				"GET",
																				"POST",
																				"PUT",
																				"DELETE",
																				"DEL"
																			]
																		},
																		"mw": {
																			"type": "string",
																			"required": false,
																			"pattern": "^/[^/]+(/[^/]+)*$"
																		},
																		"imfv": {
																			"required": false,
																			"type": "object",
																			"properties": {
																				"commonFields": {
																					"type": "array",
																					"required": false,
																					"items": {
																						"type": "string"
																					},
																					"uniqueItems": true
																				},
																				"custom": {
																					"oneOf": [
																						{
																							"type": "string",
																							"required": false,
																							"pattern": "^/[^/]+(/[^/]+)*$"
																						},
																						{
																							"type": "object",
																							"required": false,
																							"properties": {
																								"required": {
																									"type": "boolean",
																									"required": true
																								},
																								"source": {
																									"type": "array",
																									"minItems": 1,
																									"items": {
																										"type": "string"
																									},
																									"required": true
																								},
																								"validation": {
																									"oneOf": [
																										{
																											"type": "object",
																											"required": true,
																											"additionalProperties": true
																										},
																										{
																											"type": "string",
																											"required": true
																										}
																									]
																								}
																							}
																						}
																					]
																				}
																			}
																		},
																		"_apiInfo": {
																			"requried": true,
																			"type": "object",
																			"properties": {
																				"l": {
																					"type": "string",
																					"requried": true
																				},
																				"group": {
																					"type": "string",
																					"requried": true
																				},
																				"groupMain": {
																					"type": "boolean"
																				}
																			}
																		},
																		"commonFields": {
																			"type": "array",
																			"minItems": 1,
																			"items": {
																				"type": "string"
																			}
																		},
																		"additionalProperties": {
																			"type": "object",
																			"properties": {
																				"required": {
																					"type": "boolean",
																					"required": true
																				},
																				"source": {
																					"type": "array",
																					"minItems": 1,
																					"items": {
																						"type": "string"
																					},
																					"required": true
																				},
																				"validation": {
																					"oneOf": [
																						{
																							"type": "object",
																							"required": true,
																							"additionalProperties": true
																						},
																						{
																							"type": "string",
																							"required": true
																						}
																					]
																				}
																			}
																		}
																	}
																}
															},
															{
																"type": "object",
																"required": true,
																"patternProperties": {
																	"^/[a-zA-Z0-9_.-]+$": {
																		"type": "object",
																		"properties": {
																			"method": {
																				"type": "string",
																				"required": false,
																				"enum": [
																					"GET",
																					"POST",
																					"PUT",
																					"DELETE",
																					"DEL"
																				]
																			},
																			"mw": {
																				"type": "string",
																				"required": false,
																				"pattern": "^/[^/]+(/[^/]+)*$"
																			},
																			"imfv": {
																				"required": false,
																				"type": "object",
																				"properties": {
																					"commonFields": {
																						"type": "array",
																						"required": false,
																						"items": {
																							"type": "string"
																						},
																						"uniqueItems": true
																					},
																					"custom": {
																						"oneOf": [
																							{
																								"type": "string",
																								"required": false,
																								"pattern": "^/[^/]+(/[^/]+)*$"
																							},
																							{
																								"type": "object",
																								"required": false,
																								"properties": {
																									"required": {
																										"type": "boolean",
																										"required": true
																									},
																									"source": {
																										"type": "array",
																										"minItems": 1,
																										"items": {
																											"type": "string"
																										},
																										"required": true
																									},
																									"validation": {
																										"oneOf": [
																											{
																												"type": "object",
																												"required": true,
																												"additionalProperties": true
																											},
																											{
																												"type": "string",
																												"required": true
																											}
																										]
																									}
																								}
																							}
																						]
																					}
																				}
																			},
																			"_apiInfo": {
																				"requried": true,
																				"type": "object",
																				"properties": {
																					"l": {
																						"type": "string",
																						"requried": true
																					},
																					"group": {
																						"type": "string",
																						"requried": true
																					},
																					"groupMain": {
																						"type": "boolean"
																					}
																				}
																			},
																			"commonFields": {
																				"type": "array",
																				"minItems": 1,
																				"items": {
																					"type": "string"
																				}
																			},
																			"additionalProperties": {
																				"type": "object",
																				"properties": {
																					"required": {
																						"type": "boolean",
																						"required": true
																					},
																					"source": {
																						"type": "array",
																						"minItems": 1,
																						"items": {
																							"type": "string"
																						},
																						"required": true
																					},
																					"validation": {
																						"oneOf": [
																							{
																								"type": "object",
																								"required": true,
																								"additionalProperties": true
																							},
																							{
																								"type": "string",
																								"required": true
																							}
																						]
																					}
																				}
																			}
																		}
																	}
																}
															}
														]
													}
												}
											},
											{
												"type": "string",
												"required": false
											}
										]
									}
								}
							}
						},
						"additionalProperties": {
							"type": "object",
							"patternProperties": {
								'\\^\\(d\\+\\.\\)\\?\\(d\\+\\.\\)\\?\\(\\*\\|d\\+\\)\\$': {
									"type": "object",
									"properties": {
										"extKeyRequired": {
											"type": "boolean"
										},
										"oauth": {
											"type": "boolean"
										},
										"urac_Profile": {
											"type": "boolean"
										},
										"urac": {
											"type": "boolean"
										},
										"urac_ACL": {
											"type": "boolean"
										},
										"provision_ACL": {
											"type": "boolean"
										},
										"swagger": {
											"type": "boolean"
										},
										"acl": {
											"type": "boolean"
										},
										"url": {
											"type": "string"
										},
										"swaggerInput": {
											"type": "string"
										},
										"errors": {
											"oneOf": [
												{
													"type": "object",
													"required": false,
													"patternProperties": {
														"^[0-9]+$": {
															"type": "string",
															"required": true,
															"minLength": 5
														}
													}
												},
												{
													"type": "string",
													"required": false
												}
											]
										},
										"schema": {
											"oneOf": [
												{
													"type": "object",
													"required": true,
													"properties": {
														"commonFields": {
															"oneOf": [
																{
																	"type": "string",
																	"required": true,
																	"pattern": "^/[^/]+(/[^/]+)*$"
																},
																{
																	"type": "object",
																	"additionalProperties": {
																		"type": "object",
																		"properties": {
																			"required": {
																				"type": "boolean",
																				"required": true
																			},
																			"source": {
																				"type": "array",
																				"minItems": 1,
																				"items": {
																					"type": "string"
																				},
																				"required": true
																			},
																			"validation": {
																				"oneOf": [
																					{
																						"type": "object",
																						"required": true,
																						"additionalProperties": true
																					},
																					{
																						"type": "string",
																						"required": true
																					}
																				]
																			}
																		}
																	}
																}
															]
														},
														"patternProperties": {
															"oneOf": [
																{
																	"^/[a-zA-Z0-9_.-]+$": {
																		"type": "object",
																		"properties": {
																			"method": {
																				"type": "string",
																				"required": false,
																				"enum": [
																					"GET",
																					"POST",
																					"PUT",
																					"DELETE",
																					"DEL"
																				]
																			},
																			"mw": {
																				"type": "string",
																				"required": false,
																				"pattern": "^/[^/]+(/[^/]+)*$"
																			},
																			"imfv": {
																				"required": false,
																				"type": "object",
																				"properties": {
																					"commonFields": {
																						"type": "array",
																						"required": false,
																						"items": {
																							"type": "string"
																						},
																						"uniqueItems": true
																					},
																					"custom": {
																						"oneOf": [
																							{
																								"type": "string",
																								"required": false,
																								"pattern": "^/[^/]+(/[^/]+)*$"
																							},
																							{
																								"type": "object",
																								"required": false,
																								"properties": {
																									"required": {
																										"type": "boolean",
																										"required": true
																									},
																									"source": {
																										"type": "array",
																										"minItems": 1,
																										"items": {
																											"type": "string"
																										},
																										"required": true
																									},
																									"validation": {
																										"oneOf": [
																											{
																												"type": "object",
																												"required": true,
																												"additionalProperties": true
																											},
																											{
																												"type": "string",
																												"required": true
																											}
																										]
																									}
																								}
																							}
																						]
																					}
																				}
																			},
																			"_apiInfo": {
																				"requried": true,
																				"type": "object",
																				"properties": {
																					"l": {
																						"type": "string",
																						"requried": true
																					},
																					"group": {
																						"type": "string",
																						"requried": true
																					},
																					"groupMain": {
																						"type": "boolean"
																					}
																				}
																			},
																			"commonFields": {
																				"type": "array",
																				"minItems": 1,
																				"items": {
																					"type": "string"
																				}
																			},
																			"additionalProperties": {
																				"type": "object",
																				"properties": {
																					"required": {
																						"type": "boolean",
																						"required": true
																					},
																					"source": {
																						"type": "array",
																						"minItems": 1,
																						"items": {
																							"type": "string"
																						},
																						"required": true
																					},
																					"validation": {
																						"oneOf": [
																							{
																								"type": "object",
																								"required": true,
																								"additionalProperties": true
																							},
																							{
																								"type": "string",
																								"required": true
																							}
																						]
																					}
																				}
																			}
																		}
																	}
																},
																{
																	"type": "object",
																	"required": true,
																	"patternProperties": {
																		"^/[a-zA-Z0-9_.-]+$": {
																			"type": "object",
																			"properties": {
																				"method": {
																					"type": "string",
																					"required": false,
																					"enum": [
																						"GET",
																						"POST",
																						"PUT",
																						"DELETE",
																						"DEL"
																					]
																				},
																				"mw": {
																					"type": "string",
																					"required": false,
																					"pattern": "^/[^/]+(/[^/]+)*$"
																				},
																				"imfv": {
																					"required": false,
																					"type": "object",
																					"properties": {
																						"commonFields": {
																							"type": "array",
																							"required": false,
																							"items": {
																								"type": "string"
																							},
																							"uniqueItems": true
																						},
																						"custom": {
																							"oneOf": [
																								{
																									"type": "string",
																									"required": false,
																									"pattern": "^/[^/]+(/[^/]+)*$"
																								},
																								{
																									"type": "object",
																									"required": false,
																									"properties": {
																										"required": {
																											"type": "boolean",
																											"required": true
																										},
																										"source": {
																											"type": "array",
																											"minItems": 1,
																											"items": {
																												"type": "string"
																											},
																											"required": true
																										},
																										"validation": {
																											"oneOf": [
																												{
																													"type": "object",
																													"required": true,
																													"additionalProperties": true
																												},
																												{
																													"type": "string",
																													"required": true
																												}
																											]
																										}
																									}
																								}
																							]
																						}
																					}
																				},
																				"_apiInfo": {
																					"requried": true,
																					"type": "object",
																					"properties": {
																						"l": {
																							"type": "string",
																							"requried": true
																						},
																						"group": {
																							"type": "string",
																							"requried": true
																						},
																						"groupMain": {
																							"type": "boolean"
																						}
																					}
																				},
																				"commonFields": {
																					"type": "array",
																					"minItems": 1,
																					"items": {
																						"type": "string"
																					}
																				},
																				"additionalProperties": {
																					"type": "object",
																					"properties": {
																						"required": {
																							"type": "boolean",
																							"required": true
																						},
																						"source": {
																							"type": "array",
																							"minItems": 1,
																							"items": {
																								"type": "string"
																							},
																							"required": true
																						},
																						"validation": {
																							"oneOf": [
																								{
																									"type": "object",
																									"required": true,
																									"additionalProperties": true
																								},
																								{
																									"type": "string",
																									"required": true
																								}
																							]
																						}
																					}
																				}
																			}
																		}
																	}
																}
															]
														}
													}
												},
												{
													"type": "string",
													"required": false
												}
											]
										}
									}
								}
							}
						}
					}
				},
				"serviceName": {
					"source": ['query.serviceName', 'body.serviceName'],
					"required": true,
					"validation": {
						"type": "string",
						"pattern": /^[a-z0-9\-]+$/
					}
				},
				"serviceGroup": {
					"source": ['query.serviceGroup', 'body.serviceGroup'],
					"required": true,
					"validation": {"type": "string"}
				},
				"servicePort": {
					"source": ['query.servicePort', 'body.servicePort'],
					"required": true,
					"validation": {"type": "number", "minimum": 1}
				},
				"serviceVersion": {
					"source": ['query.serviceVersion', 'body.serviceVersion'],
					"required": false,
					"validation": {"type": "string"}
				},
				"requestTimeout": {
					"source": ['query.requestTimeout', 'body.requestTimeout'],
					"required": true,
					"validation": {"type": "number", "minimum": 1}
				},
				"requestTimeoutRenewal": {
					"source": ['query.requestTimeoutRenewal', 'body.requestTimeoutRenewal'],
					"required": true,
					"validation": {"type": "number", "minimum": 1}
				},
				"defaultAuthentication": {
					"source": ['query.defaultAuthentication', 'body.defaultAuthentication'],
					"required": false,
					"validation": {"type": "string"}
				},
				"epType": {
					"source": ['query.epType', 'body.epType'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ["soap", "rest"]
					}
				},
				"oauth": {
					"source": ['query.oauth', 'body.oauth'],
					"required": false,
					"default": false,
					"validation": {"type": "boolean"}
				},
				"extKeyRequired": {
					"source": ['query.extKeyRequired', 'body.extKeyRequired'],
					"required": false,
					"default": false,
					"validation": {"type": "boolean"}
				},
				"swaggerInput": {
					"source": ['query.swaggerInput', 'body.swaggerInput'],
					"required": false,
					"validation": {"type": "string"}
				},
				"authentications": {
					"source": ['query.authentications', 'body.authentications'],
					"required": false,
					"validation": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"name": {
									"type": "string",
									"required": true
								},
								"category": {
									"type": "string",
									"required": true
								}
							}
						}
					}
				},
				"prerequisites": {
					"source": ['body.prerequisites'],
					"required": false,
					"validation": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"cpu": {"type": "string"},
							"memory": {"type": "string"}
						}
					}
				},
				"schemas": {
					"source": ['body.schemas'],
					"required": false,
					"validation": serviceSchema.contract
				}
			},
			
			"/apiBuilder/authentication/update": {
				"_apiInfo": {
					"l": "Update Route Authentication Method",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType', 'body.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"endpointId": {
					"source": ['query.endpointId', 'body.endpointId'],
					"required": true,
					"validation": {"type": "string"}
				},
				"schemaKey": {
					"source": ['query.schemaKey', 'body.schemaKey'],
					"required": true,
					"validation": {"type": "string"}
				},
				"routeKey": {
					"source": ['query.routeKey', 'body.routeKey'],
					"required": true,
					"validation": {"type": "string"}
				},
				"authentication": {
					"source": ['query.authentication', 'body.authentication'],
					"required": false,
					"validation": {"type": "string"}
				}
			},
			
			"/apiBuilder/convertSwaggerToImfv": {
				"_apiInfo": {
					"l": "Convert Swagger String To an IMFV Soajs Object",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType', 'body.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"id": {
					"source": ['query.id', 'body.id'],
					"required": true,
					"validation": {"type": "string"}
				},
				"swagger": {
					"source": ['query.swagger', 'body.swagger'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/apiBuilder/convertImfvToSwagger": {
				"_apiInfo": {
					"l": "Convert IMFV Soajs Object to a Swagger String",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType', 'body.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"id": {
					"source": ['query.id', 'body.id'],
					"required": true,
					"validation": {"type": "string"}
				},
				"schema": {
					"source": ['query.schema', 'body.schema'],
					"required": true,
					"validation": {
						"type": "object",
						"properties": {},
						"additionalProperties": true
					}
				}
			},
			
			"/secrets/add": {
				"_apiInfo": {
					"l": "Add Secret",
					"group": "Secrets"
				},
				'commonFields': ['soajs_project'],
				"name": {
					"source": ['body.name'],
					"required": true,
					"validation": {
						"type": "string",
						"required": true,
						"format": "lowercase",
						"pattern": /[a-zA-Z0-9_\-]/
					}
				},
				"env": {
					"source": ['body.env'],
					"required": true,
					"validation": {"type": "string", "required": true}
				},
				"type": {
					"source": ['body.type'],
					"required": false,
					"validation": {"type": "string", "required": true}
				},
				"namespace": {
					"source": ['body.namespace'],
					"required": false,
					"validation": {"type": "string", "required": false}
				},
				"data": {
					"source": ['body.data'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra": {
				"_apiInfo": {
					"l": "Connect Infra Providers",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project'],
				"label": {
					"source": ['body.label'],
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
				"api": {
					"source": ['body.api'],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},
			
			"/infra/template": {
				"_apiInfo": {
					"l": "Add Infra as Code Template",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"template": {
					"source": ['body.template'],
					"required": true,
					"validation": {
						"type": "object",
						"properties": {
							'name': {
								'required': true,
								'type': 'string'
							},
							'description': {
								'required': false,
								'type': 'string'
							},
							'location': {
								'required': true,
								'type': 'string'
							},
							'driver': {
								'type': 'string',
								'required': true
							},
							'technology': {
								'required': true,
								'type': 'string'
							},
							'content': {
								'required': true,
								'type': 'string'
							},
							'inputs': {
								'required': false,
								'type': 'string'
							},
							'display': {
								'required': false,
								'type': 'string'
							},
							'imfv': {
								'required': false,
								'type': 'string'
							}
						}
					}
				}
			},
			
			"/infra/template/upload": {
				"_apiInfo": {
					"l": "Update Infra as Code Template",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project'],
				"inputs": {
					"source": ['body.inputs'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"display": {
					"source": ['body.display'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"imfv": {
					"source": ['body.imfv'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"name": {
					"source": ['body.name'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra/cluster/scale": {
				"_apiInfo": {
					"l": "Scale Cluster at Infra Provider",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"envCode": {
					"source": ['query.envCode'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"number": {
					"source": ['body.number'],
					"required": true,
					"validation": {
						"type": "number"
					}
				}
			},
			
			"/infra/extras": {
				"_apiInfo": {
					"l": "Create Infra component",
					"group": "HA Cloud"
				},
				"commonFields": ['soajs_project'],
				'envCode': {
					'source': ['query.envCode', 'body.envCode'],
					'required': false,
					'validation': {
						'type': 'string'
					}
				},
				"infraId": {
					"source": ['query.infraId', 'body.infraId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"technology": {
					"source": ['query.technology', 'body.technology'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"waitResponse": {
					"source": ['query.waitResponse', 'body.waitResponse'],
					"required": false,
					"validation": {
						"type": "boolean",
						"default": false
					}
				},
				"params": {
					"source": ["body.params"],
					"required": true,
					"validation": {
						"type": "object"
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
				"commonFields": ['soajs_project'],
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
						"type": "object",
						"properties": {
							"extKeyRequired": {
								"type": "boolean"
							},
							"oauth": {
								"type": "boolean"
							},
							"urac": {
								"type": "boolean"
							},
							"urac_Profile": {
								"type": "boolean"
							},
							"urac_ACL": {
								"type": "boolean"
							},
							"provision_ACL": {
								"type": "boolean"
							}
						}
					}
				}
			},
			
			"/cd/ledger/read": {
				"_apiInfo": {
					"l": "Mark as read",
					"group": "Continuous Delivery"
				},
				"commonFields": ['soajs_project'],
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
				"commonFields": ['soajs_project'],
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
						'type': 'object',
						'properties': {
							"env": {
								"required": true,
								"type": "string"
							},
							"recipe": {
								"required": true,
								"type": "string"
							},
							"gitSource": {
								"required": false,
								"type": "object",
								"properties": {
									"owner": {"required": true, "type": "string"},
									"repo": {"required": true, "type": "string"},
									"branch": {"required": true, "type": "string"},
									"commit": {"required": false, "type": "string"}
								}
							},
							"deployConfig": {
								"required": true,
								"type": "object",
								"properties": {
									"memoryLimit": {"required": false, "type": "number", "default": 209715200},
									"cpuLimit": {"required": false, "type": "string"},
									"isKubernetes": {"required": false, "type": "boolean"},
									"replication": {
										"required": false,
										"type": "object",
										"properties": {
											"mode": {
												"required": true,
												"type": "string",
												"enum": ['replicated', 'global', 'deployment', 'daemonset']
											},
											"replicas": {"required": false, "type": "number", "minimum": 1}
										}
									},
									"region": {"required": false, "type": "string"},
									"infra": {"required": false, "type": "string"},
									"type": {"required": false, "type": "string"},
									"vmConfiguration": {
										"required": false,
										"type": "object",
										"properties": {
											"vmLayer": {"required": true, "type": "string"},
										}
									},
								}
							},
							"autoScale": {
								"required": false,
								"type": "object",
								"properties": {
									"replicas": {
										"type": "object",
										"required": true,
										"properties": {
											"min": {"type": "number", "minimum": 1, "required": true},
											"max": {"type": "number", "minimum": 1, "required": true}
										}
									},
									"metrics": {
										"type": "object",
										"required": true,
										"properties": {
											"cpu": {
												"type": "object",
												"required": true,
												"properties": {
													"percent": {"type": "number", "minimum": 1, "required": true}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			},
			
			"/environment/update": {
				_apiInfo: {
					"l": "Update Environment",
					"group": "Environment"
				},
				"commonFields": ['id', 'description', 'services', 'soajs_project'],
				"domain": {
					"source": ['body.domain'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"deployer": {
					"source": ['body.deployer'],
					"required": true,
					"validation": {
						"type": "object"
					}
				},
				"machineip": {
					"source": ['body.machineip'],
					"required": false,
					"validation": {
						"type": "string"
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
				"commonFields": ['id', 'soajs_project'],
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
				"commonFields": ['soajs_project', 'env'],
				"prefix": {
					"source": ['body.prefix'],
					"required": false,
					"validation": {"type": "string", "required": false}
				},
				"name": {
					"source": ['body.name'],
					"required": true,
					"validation": {"type": "string", "required": true}
				},
				"cluster": {
					"source": ['body.cluster'],
					"required": true,
					"validation": {"type": "string", "required": true}
				},
				"tenantSpecific": {
					"source": ['body.tenantSpecific'],
					"required": false,
					"validation": {"type": "boolean", "required": true}
				},
				"sessionInfo": {
					"source": ['body.sessionInfo'],
					"required": false,
					"validation": {
						"type": "object",
						"required": true,
						"properties": {
							"store": {"type": "object", "required": true},
							"dbName": {"type": "string", "required": true},
							"expireAfter": {"type": "integer", "required": true},
							"collection": {"type": "string", "required": true},
							"stringify": {"type": "boolean", "required": true}
						}
					}
				}
			},
			
			"/environment/dbs/updatePrefix": {
				_apiInfo: {
					"l": "Update Environment Databases Prefix",
					"group": "Environment Databases"
				},
				"commonFields": ['soajs_project', 'env'],
				"prefix": {
					"source": ['body.prefix'],
					"required": false,
					"validation": {"type": "string", "required": false}
				}
			},
			
			"/resources/update": {
				_apiInfo: {
					"l": "Update Resource",
					"group": "Resources"
				},
				"commonFields": ['soajs_project', 'env'],
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
				"commonFields": ['soajs_project'],
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
				"status": {
					"source": ['body.status'],
					"required": false,
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
							"deploy": {"type": "boolean", "required": true},
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
				"commonFields": ['soajs_project', 'env'],
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
				"commonFields": ['soajs_project', 'env']
			},
			
			"/environment/platforms/deployer/update": {
				_apiInfo: {
					"l": "Change Deployer Type",
					"group": "Environment Platforms"
				},
				"commonFields": ['soajs_project', 'env'],
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
						"type": "object",
						"properties": {
							"namespace": {
								"type": "object",
								"properties": {
									"default": {
										"required": true,
										"type": "string"
									},
									"perService": {
										"required": true,
										"type": "boolean"
									}
								}
							}
						}
					}
				}
			},
			
			"/product/update": {
				_apiInfo: {
					"l": "Update Product",
					"group": "Product"
				},
				"commonFields": ['id', 'name', 'description', 'soajs_project']
			},
			
			"/product/packages/update": {
				_apiInfo: {
					"l": "Update Product Package",
					"group": "Product"
				},
				"commonFields": ['id', 'name', 'description', '_TTL', 'acl', 'soajs_project'],
				"code": {
					"source": ["query.code"],
					"required": true,
					"validation": {
						"type": "string",
						"format": "alphanumeric"
					}
				}
			},
			
			"/product/scope/update": {
				_apiInfo: {
					"l": "Update Product Package",
					"group": "Product"
				},
				"commonFields": ['id', 'acl', 'soajs_project'],
				"scope": {
					"source": ["body.scope"],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},
			
			"/tenant/update": {
				_apiInfo: {
					"l": "Update Tenant",
					"group": "Tenant"
				},
				"commonFields": ['id', 'name', 'description', 'soajs_project'],
				"type": {
					"source": ['body.type'],
					"required": false,
					"default": "client",
					"validation": {
						"type": "string",
						"enum": ["admin", "product", "client", 'soajs_project']
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
				"commonFields": ['id', 'secret', 'redirectURI', 'availableEnv', 'soajs_project'],
				"type": {
					"source": ['body.type'],
					"required": false,
					"validation": {
						"type": "number",
						"enum": [0, 2]
					}
				},
				"oauthType": {
					"source": ['body.oauthType'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ["urac", "miniurac", "off"]
					}
				},
			},
			
			"/tenant/oauth/users/update": {
				_apiInfo: {
					"l": "Update Tenant oAuth User",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'uId', 'soajs_project'],
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
				"commonFields": ['soajs_project', 'id', 'appId', 'description', 'acl', 'productCode', 'packageCode', 'clearAcl']
			},
			
			"/tenant/application/key/ext/update": {
				_apiInfo: {
					"l": "Update Tenant Application External Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'extKey', 'expDate', 'device', 'geo', 'soajs_project'],
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
				"commonFields": ['id', 'appId', 'key', 'envCode', 'config', 'soajs_project']
			},
			
			"/settings/tenant/update": {
				_apiInfo: {
					"l": "Update Tenant",
					"group": "Tenant Settings"
				},
				"commonFields": ['name', 'description', 'soajs_project'],
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
				"commonFields": ['secret', 'redirectURI', 'oauthType', 'availableEnv', 'soajs_project']
			},
			
			"/settings/tenant/oauth/users/update": {
				_apiInfo: {
					"l": "Update Tenant oAuth User",
					"group": "Tenant Settings"
				},
				"commonFields": ['uId', 'soajs_project'],
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
				"commonFields": ['appId', 'key', 'extKey', 'expDate', 'device', 'geo', 'soajs_project'],
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
				"commonFields": ['appId', 'key', 'envCode', 'config', 'soajs_project']
			},
			
			"/daemons/groupConfig/update": {
				_apiInfo: {
					"l": "Update Daemon Group Configuration",
					"group": "Daemons"
				},
				'commonFields': ['soajs_project', 'id', 'groupName', 'daemon', 'cronTime', 'cronTimeDate', 'timeZone', 'interval', 'status', 'processing', 'jobs', 'order', 'solo'],
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
				'commonFields': ['id', 'jobName', 'soajs_project'],
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
				'commonFields': ['id', 'jobName', 'soajs_project'],
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
				'commonFields': ['soajs_project', 'env'],
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
			
			"/cloud/services/scale": {
				"_apiInfo": {
					"l": "Scale HA Service",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'namespace'],
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
						"type": "number",
						"minimum": 0
					}
				}
			},
			
			"/cloud/services/redeploy": {
				"_apiInfo": {
					"l": "Redeploy HA Service",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'namespace', 'infraId'],
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
							"branch": {"type": "string", "required": false},
							"commit": {"type": "string", "required": false},
							"memory": {"type": "number", "required": false, "minimum": 0},
							"image": {
								"type": "object",
								"required": false,
								"properties": {
									"prefix": {"required": false, "type": "string"},
									"name": {"required": false, "type": "string"},
									"tag": {"required": false, "type": "string"},
								}
							},
							"env": {
								"type": "object",
								"required": false
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
				'commonFields': ['soajs_project', 'env', 'namespace'],
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
									"min": {"type": "number", "minimum": 1, "required": true},
									"max": {"type": "number", "minimum": 1, "required": true}
								}
							},
							"metrics": {"type": "object", "required": true}
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
								"id": {"type": "string", "required": true},
								"type": {"type": "string", "required": true, "enum": ["deployment"]}
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
				'commonFields': ['soajs_project', 'env'],
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
									"min": {"type": "number", "minimum": 1, "required": true},
									"max": {"type": "number", "minimum": 1, "required": true}
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
											"percent": {"type": "number", "minimum": 1, "required": true}
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
				'commonFields': ['soajs_project'],
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
					"l": "Sync Repository",
					"group": "Git Accounts"
				},
				'commonFields': ['soajs_project'],
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
				},
				"branch": {
					"source": ['body.branch'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/gitAccounts/repo/sync/branches": {
				"_apiInfo": {
					"l": "Sync Repository Branches",
					"group": "Git Accounts"
				},
				'commonFields': ['soajs_project'],
				"name": {
					"source": ['body.name'],
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
						"enum": ["service", "daemon", "multi"]
					}
				},
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
				}
			},
			
			"/ci/provider": {
				"_apiInfo": {
					"l": "Deactivate CI Provider",
					"group": "Continuous Integration"
				},
				'commonFields': ['soajs_project'],
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
				"commonFields": ["id", 'soajs_project'],
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
				'commonFields': ['soajs_project'],
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
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"name": {"type": "string", "required": true},
								"value": {"type": "string", "required": false},
								"public": {"type": "boolean", "required": false}
							}
						}
					}
				}
			},
			
			"/gitAccounts/repo/deactivate": {
				"_apiInfo": {
					"l": "Deactivate Repository",
					"group": "Git Accounts"
				},
				'commonFields': ['soajs_project'],
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
				},
				"branch": {
					"source": ['query.branch'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/apiBuilder/edit": {
				"_apiInfo": {
					"l": "Edit Endpoint",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType', 'body.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"id": {
					"source": ['query.id', 'body.id'],
					"required": true,
					"validation": {"type": "string"}
				},
				"port": {
					"required": false,
					"source": ['body.port'],
					"validation":{
						"type": "integer"
					}
				},
				"path": {
					"required": false,
					"source": ['body.path'],
					"validation":{
						"type": "string"
					}
				},
				"versions": {
					"required": false,
					"source": ['body.versions'],
					"validation":{
						"type": "object",
						"patternProperties": {
							'\\^\\(d\\+\\.\\)\\?\\(d\\+\\.\\)\\?\\(\\*\\|d\\+\\)\\$': {
								"type": "object",
								"properties": {
									"extKeyRequired": {
										"type": "boolean"
									},
									"oauth": {
										"type": "boolean"
									},
									"urac_Profile": {
										"type": "boolean"
									},
									"urac": {
										"type": "boolean"
									},
									"urac_ACL": {
										"type": "boolean"
									},
									"provision_ACL": {
										"type": "boolean"
									},
									"swagger": {
										"type": "boolean"
									},
									"acl": {
										"type": "boolean"
									},
									"url": {
										"type": "string"
									},
									"swaggerInput": {
										"type": "string"
									},
									"errors": {
										"oneOf": [
											{
												"type": "object",
												"required": false,
												"patternProperties": {
													"^[0-9]+$": {
														"type": "string",
														"required": true,
														"minLength": 5
													}
												}
											},
											{
												"type": "string",
												"required": false
											}
										]
									},
									"schema": {
										"oneOf": [
											{
												"type": "object",
												"required": true,
												"properties": {
													"commonFields": {
														"oneOf": [
															{
																"type": "string",
																"required": true,
																"pattern": "^/[^/]+(/[^/]+)*$"
															},
															{
																"type": "object",
																"additionalProperties": {
																	"type": "object",
																	"properties": {
																		"required": {
																			"type": "boolean",
																			"required": true
																		},
																		"source": {
																			"type": "array",
																			"minItems": 1,
																			"items": {
																				"type": "string"
																			},
																			"required": true
																		},
																		"validation": {
																			"oneOf": [
																				{
																					"type": "object",
																					"required": true,
																					"additionalProperties": true
																				},
																				{
																					"type": "string",
																					"required": true
																				}
																			]
																		}
																	}
																}
															}
														]
													},
													"patternProperties": {
														"oneOf": [
															{
																"^/[a-zA-Z0-9_.-]+$": {
																	"type": "object",
																	"properties": {
																		"method": {
																			"type": "string",
																			"required": false,
																			"enum": [
																				"GET",
																				"POST",
																				"PUT",
																				"DELETE",
																				"DEL"
																			]
																		},
																		"mw": {
																			"type": "string",
																			"required": false,
																			"pattern": "^/[^/]+(/[^/]+)*$"
																		},
																		"imfv": {
																			"required": false,
																			"type": "object",
																			"properties": {
																				"commonFields": {
																					"type": "array",
																					"required": false,
																					"items": {
																						"type": "string"
																					},
																					"uniqueItems": true
																				},
																				"custom": {
																					"oneOf": [
																						{
																							"type": "string",
																							"required": false,
																							"pattern": "^/[^/]+(/[^/]+)*$"
																						},
																						{
																							"type": "object",
																							"required": false,
																							"properties": {
																								"required": {
																									"type": "boolean",
																									"required": true
																								},
																								"source": {
																									"type": "array",
																									"minItems": 1,
																									"items": {
																										"type": "string"
																									},
																									"required": true
																								},
																								"validation": {
																									"oneOf": [
																										{
																											"type": "object",
																											"required": true,
																											"additionalProperties": true
																										},
																										{
																											"type": "string",
																											"required": true
																										}
																									]
																								}
																							}
																						}
																					]
																				}
																			}
																		},
																		"_apiInfo": {
																			"requried": true,
																			"type": "object",
																			"properties": {
																				"l": {
																					"type": "string",
																					"requried": true
																				},
																				"group": {
																					"type": "string",
																					"requried": true
																				},
																				"groupMain": {
																					"type": "boolean"
																				}
																			}
																		},
																		"commonFields": {
																			"type": "array",
																			"minItems": 1,
																			"items": {
																				"type": "string"
																			}
																		},
																		"additionalProperties": {
																			"type": "object",
																			"properties": {
																				"required": {
																					"type": "boolean",
																					"required": true
																				},
																				"source": {
																					"type": "array",
																					"minItems": 1,
																					"items": {
																						"type": "string"
																					},
																					"required": true
																				},
																				"validation": {
																					"oneOf": [
																						{
																							"type": "object",
																							"required": true,
																							"additionalProperties": true
																						},
																						{
																							"type": "string",
																							"required": true
																						}
																					]
																				}
																			}
																		}
																	}
																}
															},
															{
																"type": "object",
																"required": true,
																"patternProperties": {
																	"^/[a-zA-Z0-9_.-]+$": {
																		"type": "object",
																		"properties": {
																			"method": {
																				"type": "string",
																				"required": false,
																				"enum": [
																					"GET",
																					"POST",
																					"PUT",
																					"DELETE",
																					"DEL"
																				]
																			},
																			"mw": {
																				"type": "string",
																				"required": false,
																				"pattern": "^/[^/]+(/[^/]+)*$"
																			},
																			"imfv": {
																				"required": false,
																				"type": "object",
																				"properties": {
																					"commonFields": {
																						"type": "array",
																						"required": false,
																						"items": {
																							"type": "string"
																						},
																						"uniqueItems": true
																					},
																					"custom": {
																						"oneOf": [
																							{
																								"type": "string",
																								"required": false,
																								"pattern": "^/[^/]+(/[^/]+)*$"
																							},
																							{
																								"type": "object",
																								"required": false,
																								"properties": {
																									"required": {
																										"type": "boolean",
																										"required": true
																									},
																									"source": {
																										"type": "array",
																										"minItems": 1,
																										"items": {
																											"type": "string"
																										},
																										"required": true
																									},
																									"validation": {
																										"oneOf": [
																											{
																												"type": "object",
																												"required": true,
																												"additionalProperties": true
																											},
																											{
																												"type": "string",
																												"required": true
																											}
																										]
																									}
																								}
																							}
																						]
																					}
																				}
																			},
																			"_apiInfo": {
																				"requried": true,
																				"type": "object",
																				"properties": {
																					"l": {
																						"type": "string",
																						"requried": true
																					},
																					"group": {
																						"type": "string",
																						"requried": true
																					},
																					"groupMain": {
																						"type": "boolean"
																					}
																				}
																			},
																			"commonFields": {
																				"type": "array",
																				"minItems": 1,
																				"items": {
																					"type": "string"
																				}
																			},
																			"additionalProperties": {
																				"type": "object",
																				"properties": {
																					"required": {
																						"type": "boolean",
																						"required": true
																					},
																					"source": {
																						"type": "array",
																						"minItems": 1,
																						"items": {
																							"type": "string"
																						},
																						"required": true
																					},
																					"validation": {
																						"oneOf": [
																							{
																								"type": "object",
																								"required": true,
																								"additionalProperties": true
																							},
																							{
																								"type": "string",
																								"required": true
																							}
																						]
																					}
																				}
																			}
																		}
																	}
																}
															}
														]
													}
												}
											},
											{
												"type": "string",
												"required": false
											}
										]
									}
								}
							}
						},
						"additionalProperties": {
							"type": "object",
							"patternProperties": {
								'\\^\\(d\\+\\.\\)\\?\\(d\\+\\.\\)\\?\\(\\*\\|d\\+\\)\\$': {
									"type": "object",
									"properties": {
										"extKeyRequired": {
											"type": "boolean"
										},
										"oauth": {
											"type": "boolean"
										},
										"urac_Profile": {
											"type": "boolean"
										},
										"urac": {
											"type": "boolean"
										},
										"urac_ACL": {
											"type": "boolean"
										},
										"provision_ACL": {
											"type": "boolean"
										},
										"swagger": {
											"type": "boolean"
										},
										"acl": {
											"type": "boolean"
										},
										"url": {
											"type": "string"
										},
										"swaggerInput": {
											"type": "string"
										},
										"errors": {
											"oneOf": [
												{
													"type": "object",
													"required": false,
													"patternProperties": {
														"^[0-9]+$": {
															"type": "string",
															"required": true,
															"minLength": 5
														}
													}
												},
												{
													"type": "string",
													"required": false
												}
											]
										},
										"schema": {
											"oneOf": [
												{
													"type": "object",
													"required": true,
													"properties": {
														"commonFields": {
															"oneOf": [
																{
																	"type": "string",
																	"required": true,
																	"pattern": "^/[^/]+(/[^/]+)*$"
																},
																{
																	"type": "object",
																	"additionalProperties": {
																		"type": "object",
																		"properties": {
																			"required": {
																				"type": "boolean",
																				"required": true
																			},
																			"source": {
																				"type": "array",
																				"minItems": 1,
																				"items": {
																					"type": "string"
																				},
																				"required": true
																			},
																			"validation": {
																				"oneOf": [
																					{
																						"type": "object",
																						"required": true,
																						"additionalProperties": true
																					},
																					{
																						"type": "string",
																						"required": true
																					}
																				]
																			}
																		}
																	}
																}
															]
														},
														"patternProperties": {
															"oneOf": [
																{
																	"^/[a-zA-Z0-9_.-]+$": {
																		"type": "object",
																		"properties": {
																			"method": {
																				"type": "string",
																				"required": false,
																				"enum": [
																					"GET",
																					"POST",
																					"PUT",
																					"DELETE",
																					"DEL"
																				]
																			},
																			"mw": {
																				"type": "string",
																				"required": false,
																				"pattern": "^/[^/]+(/[^/]+)*$"
																			},
																			"imfv": {
																				"required": false,
																				"type": "object",
																				"properties": {
																					"commonFields": {
																						"type": "array",
																						"required": false,
																						"items": {
																							"type": "string"
																						},
																						"uniqueItems": true
																					},
																					"custom": {
																						"oneOf": [
																							{
																								"type": "string",
																								"required": false,
																								"pattern": "^/[^/]+(/[^/]+)*$"
																							},
																							{
																								"type": "object",
																								"required": false,
																								"properties": {
																									"required": {
																										"type": "boolean",
																										"required": true
																									},
																									"source": {
																										"type": "array",
																										"minItems": 1,
																										"items": {
																											"type": "string"
																										},
																										"required": true
																									},
																									"validation": {
																										"oneOf": [
																											{
																												"type": "object",
																												"required": true,
																												"additionalProperties": true
																											},
																											{
																												"type": "string",
																												"required": true
																											}
																										]
																									}
																								}
																							}
																						]
																					}
																				}
																			},
																			"_apiInfo": {
																				"requried": true,
																				"type": "object",
																				"properties": {
																					"l": {
																						"type": "string",
																						"requried": true
																					},
																					"group": {
																						"type": "string",
																						"requried": true
																					},
																					"groupMain": {
																						"type": "boolean"
																					}
																				}
																			},
																			"commonFields": {
																				"type": "array",
																				"minItems": 1,
																				"items": {
																					"type": "string"
																				}
																			},
																			"additionalProperties": {
																				"type": "object",
																				"properties": {
																					"required": {
																						"type": "boolean",
																						"required": true
																					},
																					"source": {
																						"type": "array",
																						"minItems": 1,
																						"items": {
																							"type": "string"
																						},
																						"required": true
																					},
																					"validation": {
																						"oneOf": [
																							{
																								"type": "object",
																								"required": true,
																								"additionalProperties": true
																							},
																							{
																								"type": "string",
																								"required": true
																							}
																						]
																					}
																				}
																			}
																		}
																	}
																},
																{
																	"type": "object",
																	"required": true,
																	"patternProperties": {
																		"^/[a-zA-Z0-9_.-]+$": {
																			"type": "object",
																			"properties": {
																				"method": {
																					"type": "string",
																					"required": false,
																					"enum": [
																						"GET",
																						"POST",
																						"PUT",
																						"DELETE",
																						"DEL"
																					]
																				},
																				"mw": {
																					"type": "string",
																					"required": false,
																					"pattern": "^/[^/]+(/[^/]+)*$"
																				},
																				"imfv": {
																					"required": false,
																					"type": "object",
																					"properties": {
																						"commonFields": {
																							"type": "array",
																							"required": false,
																							"items": {
																								"type": "string"
																							},
																							"uniqueItems": true
																						},
																						"custom": {
																							"oneOf": [
																								{
																									"type": "string",
																									"required": false,
																									"pattern": "^/[^/]+(/[^/]+)*$"
																								},
																								{
																									"type": "object",
																									"required": false,
																									"properties": {
																										"required": {
																											"type": "boolean",
																											"required": true
																										},
																										"source": {
																											"type": "array",
																											"minItems": 1,
																											"items": {
																												"type": "string"
																											},
																											"required": true
																										},
																										"validation": {
																											"oneOf": [
																												{
																													"type": "object",
																													"required": true,
																													"additionalProperties": true
																												},
																												{
																													"type": "string",
																													"required": true
																												}
																											]
																										}
																									}
																								}
																							]
																						}
																					}
																				},
																				"_apiInfo": {
																					"requried": true,
																					"type": "object",
																					"properties": {
																						"l": {
																							"type": "string",
																							"requried": true
																						},
																						"group": {
																							"type": "string",
																							"requried": true
																						},
																						"groupMain": {
																							"type": "boolean"
																						}
																					}
																				},
																				"commonFields": {
																					"type": "array",
																					"minItems": 1,
																					"items": {
																						"type": "string"
																					}
																				},
																				"additionalProperties": {
																					"type": "object",
																					"properties": {
																						"required": {
																							"type": "boolean",
																							"required": true
																						},
																						"source": {
																							"type": "array",
																							"minItems": 1,
																							"items": {
																								"type": "string"
																							},
																							"required": true
																						},
																						"validation": {
																							"oneOf": [
																								{
																									"type": "object",
																									"required": true,
																									"additionalProperties": true
																								},
																								{
																									"type": "string",
																									"required": true
																								}
																							]
																						}
																					}
																				}
																			}
																		}
																	}
																}
															]
														}
													}
												},
												{
													"type": "string",
													"required": false
												}
											]
										}
									}
								}
							}
						}
					}
				},
				"serviceName": {
					"source": ['query.serviceName', 'body.serviceName'],
					"required": true,
					"validation": {
						"type": "string",
						"pattern": /^[a-z0-9\-]+$/
					}
				},
				"serviceGroup": {
					"source": ['query.serviceGroup', 'body.serviceGroup'],
					"required": true,
					"validation": {"type": "string"}
				},
				"servicePort": {
					"source": ['query.servicePort', 'body.servicePort'],
					"required": true,
					"validation": {"type": "number", "minimum": 1}
				},
				"serviceVersion": {
					"source": ['query.serviceVersion', 'body.serviceVersion'],
					"required": false,
					"validation": {"type": "string"}
				},
				"requestTimeout": {
					"source": ['query.requestTimeout', 'body.requestTimeout'],
					"required": true,
					"validation": {"type": "number", "minimum": 1}
				},
				"requestTimeoutRenewal": {
					"source": ['query.requestTimeoutRenewal', 'body.requestTimeoutRenewal'],
					"required": true,
					"validation": {"type": "number", "minimum": 1}
				},
				"defaultAuthentication": {
					"source": ['query.defaultAuthentication', 'body.defaultAuthentication'],
					"required": false,
					"validation": {"type": "string"}
				},
				"src": {
					"source": ['body.src'],
					"required": false,
					"validation": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"provider": {
								"type": "string",
								"required": true
							},
							"url": {
								"type": "string",
								"required": false
							},
							"urls": {
								"type": "array",
								"required": true,
								"items": {
									"type": "object",
									"properties": {
										"version": {
											"type": "string",
											"required": true
										},
										"url": {
											"type": "string",
											"required": true
										}
									}
								}
							},
							"swagger": {
								"type": "array",
								"required": true,
								"items": {
									"type": "object",
									"properties": {
										"version": {
											"type": "string",
											"required": true
										},
										"content": {
											"type": "object",
											"required": true,
											"properties": {
												"type": {
													"type": "string",
													"required": true,
													"enum": ["text", "url", "git"]
												},
												"url": {
													"type": "string",
													"required": false,
												},
												"git": {
													"type": "object",
													"required": false,
													"properties": {
														"gitid": {
															"type": "string",
															"required": true
														},
														"repo": {
															"type": "string",
															"required": true
														},
														"branch": {
															"type": "string",
															"required": true
														}
													}
												},
												"content": {
													"type": "string",
													"required": false,
												}
											}
										}
									}
								}
							}
						}
					}
				},
				"epType": {
					"source": ['query.epType', 'body.epType'],
					"required": false,
					"validation": {
						"type": "string",
						"enum": ["soap", "rest"]
					}
				},
				"oauth": {
					"source": ['query.oauth', 'body.oauth'],
					"required": false,
					"default": false,
					"validation": {"type": "boolean"}
				},
				"extKeyRequired": {
					"source": ['query.extKeyRequired', 'body.extKeyRequired'],
					"required": false,
					"default": false,
					"validation": {"type": "boolean"}
				},
				"authentications": {
					"source": ['query.authentications', 'body.authentications'],
					"required": false,
					"validation": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"name": {
									"type": "string",
									"required": true
								},
								"category": {
									"type": "string",
									"required": true
								}
							}
						}
					}
				},
				"urac": {
					"source": ['body.urac'],
					"validation": {
						"type": "boolean",
					},
					"default": false,
					"required": false
				},
				"urac_Profile": {
					"source": ['body.urac_Profile'],
					"validation": {
						"type": "boolean",
					},
					"default": false,
					"required": false
				},
				"urac_ACL": {
					"source": ['body.urac_ACL'],
					"validation": {
						"type": "boolean",
					},
					"default": false,
					"required": false
				},
				"provision_ACL": {
					"source": ['body.provision_ACL'],
					"validation": {
						"type": "boolean",
					},
					"default": false,
					"required": false
				},
				"session": {
					"source": ['body.session'],
					"validation": {
						"type": "boolean",
					},
					"default": false,
					"required": false
				},
				"dbs": {
					"source": ['body.dbs'],
					"required": false,
					"validation": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"prefix": {"type": "string"},
								"name": {"type": "string", "required": true},
								"multitenant": {"type": "boolean"}
							}
						},
						"minItems": 1,
						"uniqueItems": true
					}
				}
			},
			
			"/apiBuilder/updateSchemas": {
				"_apiInfo": {
					"l": "Update Endpoint's Schemas",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType', 'body.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"endpointId": {
					"source": ['query.endpointId', 'body.endpointId'],
					"required": true,
					"validation": {"type": "string"}
				},
				"convert": {
					"source": ['query.convert', 'body.convert'],
					"required": false,
					"default": true,
					"validation": {"type": "boolean"}
				},
				"schemas": {
					"source": ['body.schemas'],
					"required": false,
					"validation": serviceSchema.contract
				},
				"swagger": {
					"source": ['query.swagger', 'body.swagger'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra": {
				"_apiInfo": {
					"l": "Modify Infra Providers Connection",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"api": {
					"source": ['body.api'],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},
			
			"/infra/template": {
				"_apiInfo": {
					"l": "Update Infra as Code Template",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"template": {
					"source": ['body.template'],
					"required": true,
					"validation": {
						"type": "object",
						"properties": {
							'name': {
								'required': true,
								'type': 'string'
							},
							'description': {
								'required': false,
								'type': 'string'
							},
							'location': {
								'required': true,
								'type': 'string'
							},
							'driver': {
								'type': 'string',
								'required': true
							},
							'technology': {
								'required': true,
								'type': 'string'
							},
							'content': {
								'required': true,
								'type': 'string'
							},
							'inputs': {
								'required': false,
								'type': 'string'
							},
							'display': {
								'required': false,
								'type': 'string'
							},
							'imfv': {
								'required': false,
								'type': 'string'
							}
						}
					}
				}
			},
			
			"/cloud/vm": {
				"_apiInfo": {
					"l": "Modify Virtual Machine Layer",
					"group": "Owner HA Cloud"
				},
				"commonFields": ['soajs_project', 'id', 'env'],
				
				"infraCodeTemplate": {
					"source": ['body.infraCodeTemplate'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"layerName": {
					"source": ['body.layerName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"specs": {
					"source": ['body.specs'],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			},
			
			"/infra/extras": {
				"_apiInfo": {
					"l": "Update Infra component",
					"group": "Owner HA Cloud"
				},
				"commonFields": ['soajs_project'],
				'envCode': {
					'source': ['query.envCode', 'body.envCode'],
					'required': false,
					'validation': {
						'type': 'string'
					}
				},
				"infraId": {
					"source": ['query.infraId', 'body.infraId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"technology": {
					"source": ['query.technology', 'body.technology'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"params": {
					"source": ["body.params"],
					"required": true,
					"validation": {
						"type": "object"
					}
				}
			}
		},
		
		"delete": {
			"/templates": {
				_apiInfo: {
					"l": "Delete Template",
					"group": "Templates"
				},
				"commonFields": ['soajs_project', 'id']
			},
			
			"/environment/delete": {
				_apiInfo: {
					"l": "Delete Environment",
					"group": "Environment"
				},
				"commonFields": ['soajs_project'],
				"force": {
					"source": ['query.force'],
					"required": true, "default": false,
					"validation": {"type": "boolean"}
				},
				'code': {
					'source': ['query.code'],
					'required': false,
					'validation': {
						'type': 'string'
					}
				},
				'id': {
					'source': ['query.id'],
					'required': false,
					'validation': {
						'type': 'string'
					}
				},
			},
			
			"/environment/dbs/delete": {
				_apiInfo: {
					"l": "Delete Environment Database",
					"group": "Environment Databases"
				},
				"commonFields": ['soajs_project', 'env'],
				"name": {
					"source": ['query.name'],
					"required": true,
					"validation": {"type": "string", "required": true}
				}
			},
			
			"/environment/platforms/detach": {
				_apiInfo: {
					"l": "Detach Container Technology",
					"group": "Environment Platforms"
				},
				"commonFields": ['soajs_project'],
				'env': {
					'source': ['query.env'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				}
			},
			
			"/environment/infra/lock": {
				"_apiInfo": {
					"l": "Unlock an environment from a Cloud Provider",
					"group": "Environment"
				},
				'commonFields': ['soajs_project'],
				'envCode': {
					"source": ['query.envCode'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/resources": {
				_apiInfo: {
					"l": "Delete a resource",
					"group": "Resources"
				},
				"commonFields": ['soajs_project', 'env'],
				"id": {
					"source": ['query.id'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"serviceId": {
					"source": ['query.serviceId'],
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
				},
				"envCode": {
					"source": ['query.envCode'],
					"required": false,
					"validation": {
						"type": "string"
					}
				},
				"config": {
					"source": ['query.config'],
					"required": false,
					"validation": {
						"type": "string",
					},
					
				},
				"resourceName": {
					"source": ['query.resourceName'],
					"required": false,
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
				"commonFields": ['soajs_project', 'env'],
				"id": {
					"source": ['query.id'],
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
				"commonFields": ['soajs_project'],
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
				"commonFields": ['id', 'soajs_project'],
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
				"commonFields": ['soajs_project'],
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
				"commonFields": ['id', 'soajs_project']
			},
			
			"/tenant/oauth/users/delete": {
				_apiInfo: {
					"l": "Delete Tenant oAuth User",
					"group": "Tenant oAuth"
				},
				"commonFields": ['id', 'uId', 'soajs_project']
			},
			
			"/tenant/application/delete": {
				_apiInfo: {
					"l": "Delete Tenant Application",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'soajs_project']
			},
			
			"/tenant/application/key/delete": {
				_apiInfo: {
					"l": "Delete Tenant Application Key",
					"group": "Tenant Application"
				},
				"commonFields": ['id', 'appId', 'key', 'soajs_project']
			},
			
			"/settings/tenant/oauth/delete": {
				_apiInfo: {
					"l": "Delete Tenant oAuth Configuration",
					"group": "Tenant Settings"
				},
				"commonFields": ['soajs_project']
			},
			
			"/settings/tenant/oauth/users/delete": {
				_apiInfo: {
					"l": "Delete Tenant oAuth User",
					"group": "Tenant Settings"
				},
				"commonFields": ['uId', 'soajs_project']
			},
			
			"/settings/tenant/application/key/delete": {
				_apiInfo: {
					"l": "Delete Tenant Application Key",
					"group": "Tenant Settings"
				},
				"commonFields": ['appId', 'key', 'soajs_project']
			},
			
			"/daemons/groupConfig/delete": {
				_apiInfo: {
					"l": "Delete Daemon Group Configuration",
					"group": "Daemons"
				},
				'commonFields': ['id', 'soajs_project']
			},
			
			"/cloud/nodes/remove": {
				"_apiInfo": {
					"l": "Remove HA Cloud Node",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env'],
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
				'commonFields': ['soajs_project', 'env', 'serviceId', 'namespace', 'mode', 'infraId', 'technology'],
				'group': {
					"source": ['query.group'],
					"required": true,
					"default": "",
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/cloud/vm/instance": {
				"_apiInfo": {
					"l": "Delete Virtual Machine",
					"group": "HA Cloud"
				},
				'commonFields': ['soajs_project', 'env', 'serviceId', 'technology'],
				'region': {
					"source": ['query.region'],
					"required": false,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/cloud/vm": {
				"_apiInfo": {
					"l": "Delete Virtual Machine Layer",
					"group": "HA Cloud"
				},
				"commonFields": ['soajs_project', 'id', 'env'],
				"layerName": {
					"source": ['query.layerName'],
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
				'commonFields': ['soajs_project', 'env'],
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
				'commonFields': ['soajs_project'],
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
						"type": "number",
						"minimum": 1
					}
				}
			},
			
			"/ci/recipe": {
				"_apiInfo": {
					"l": "Delete CI Recipe",
					"group": "Continuous Integration"
				},
				"commonFields": ["id", 'soajs_project']
			},
			
			"/gitAccounts/logout": {
				"_apiInfo": {
					"l": "Github Logout",
					"group": "Git Accounts"
				},
				'commonFields': ['soajs_project'],
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
			},
			
			"/apiBuilder/delete": {
				"_apiInfo": {
					"l": "Delete Endpoint",
					"group": "API Builder"
				},
				"commonFields": ['soajs_project'],
				"mainType": {
					"source": ['query.mainType', 'body.mainType'],
					"required": true,
					"validation": {
						"type": "string",
						"enum": ["endpoints", "services", "passThroughs"]
					}
				},
				"id": {
					"source": ['query.id', 'body.id'],
					"required": true,
					"validation": {"type": "string"}
				}
			},
			
			"/secrets/delete": {
				_apiInfo: {
					"l": "Delete Secret",
					"group": "Secrets"
				},
				'commonFields': ['soajs_project', 'namespace', 'env'],
				"name": {
					"source": ['query.name'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra": {
				"_apiInfo": {
					"l": "Deactivate Infra Provider",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id']
			},
			
			"/infra/deployment": {
				"_apiInfo": {
					"l": "Remove Infra Provider Deployment",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"deploymentId": {
					"source": ['query.deploymentId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra/template": {
				"_apiInfo": {
					"l": "Remove Template from Infra Providers",
					"group": "Infra Providers"
				},
				'commonFields': ['soajs_project', 'id'],
				"templateId": {
					"source": ['query.templateId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"templateName": {
					"source": ['query.templateName'],
					"required": true,
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/infra/extras": {
				"_apiInfo": {
					"l": "Delete Infra component",
					"group": "HA Cloud"
				},
				"commonFields": ['soajs_project'],
				'envCode': {
					'source': ['query.envCode', 'body.envCode'],
					'required': false,
					'validation': {
						'type': 'string'
					}
				},
				"infraId": {
					"source": ['query.infraId'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"technology": {
					"source": ['query.technology'],
					"required": true,
					"validation": {
						"type": "string"
					}
				},
				"section": {
					"required": true,
					"source": ['query.section'],
					"validation": {
						"type": "string",
						"enum": ["group", "network", 'loadBalancer', "publicIp", "securityGroup", 'keyPair', 'certificate']
					}
				},
				"group": {
					"required": false,
					"source": ['query.group'],
					"validation": {
						"type": "string",
					}
				},
				"region": {
					"required": false,
					"source": ['query.region'],
					"validation": {
						"type": "string",
					}
				},
				"name": {
					"required": false,
					"source": ['query.name'],
					"validation": {
						"type": "string",
					}
				},
				"id": {
					"required": false,
					"source": ['query.id'],
					"validation": {
						"type": "string"
					}
				}
			},
			
			"/services/favorite": {
				"_apiInfo": {
					"l": "Delete Service from Favorites",
					"group": "Services"
				},
				"commonFields": ['soajs_project'],
				'service': {
					'source': ['query.service'],
					'required': true,
					'validation': {
						'type': 'string'
					}
				},
				'type': {
					'source': ['query.type'],
					'required': true,
					"validation": {
						"enum": ['apiCatalog'],
						"type": "string"
					}
				}
			}
		}
	}
};
