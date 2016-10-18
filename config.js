'use strict';
var serviceConfig = require("./schemas/serviceConfig");
var cbSchema = require("./schemas/cb");
var aclSchema = require("./schemas/acl");

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
	"oauth": false,
	"session": true,
	"roaming": true,

	"hasher": {
		"hashIterations": 1024,
		"seedLength": 32
	},
	"expDateTTL": 86400000,
	"ncpLimit": 16,

	"profileLocation": process.env.SOAJS_PROFILE_LOC || "/opt/soajs/FILES/profiles/",

	images: {
		"nginx": 'soajsorg/nginx',
		"services": "soajsorg/soajs"
	},
	gitAccounts: {
		bitbucketorg: {
			apiDomain: 'https://api.bitbucket.org/1.0',
			routes: {
				getUserRecord: '/users/%USERNAME%',
				getAllRepos: '/user/repositories',
				getContent: '/repositories/%USERNAME%/%REPO_NAME%/raw/%BRANCH%/%FILE_PATH%',
				getBranches: '/repositories/%USERNAME%/%REPO_NAME%/branches'
			},
			repoConfigsFolder: __dirname + '/repoConfigs',
			defaultConfigFilePath: "config.js"
		},
		bitbucket: {
			userAgent: "SOAJS Bitbucket App",
			defaultConfigFilePath: "config.js",
			repoConfigsFolder: __dirname + '/repoConfigs',
			// required for OAuth
			apiDomain: '%PROVIDER_DOMAIN%/rest/api/1.0',
			requestUrl: '%PROVIDER_DOMAIN%/plugins/servlet/oauth/request-token',
			accessUrl: '%PROVIDER_DOMAIN%/plugins/servlet/oauth/access-token',
			authorizeUrl: '%PROVIDER_DOMAIN%/plugins/servlet/oauth/authorize',
			consumerKey: process.env.BITBUCKET_CONSUMER_KEY,
			consumerSecret: process.env.BITBUCKET_CONSUMER_SECRET_BASE64,
			signatureMethod: process.env.SIGNATURE_METHOD || 'RSA-SHA1',
			callback: 'http://localhost:3000/api/auth/bitbucket/callback'
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
			"repoConfigsFolder": __dirname + '/repoConfigs'
		}
	},

	"errors": require("./utils/errors"),
	"schema": {
		"commonFields": {
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
			"awareness": {
				"required": true,
				"source": ["body.awareness"],
				"validation": {
					"type": "boolean"
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
				'required': true,
				'validation': {
					'type': 'number'
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
			}
		},
		"/environment/list": {
			_apiInfo: {
				"l": "List Environments",
				"group": "Environment",
				"groupMain": true
			},
			"short": {
				"required": false,
				"source": ["query.short", "body.short"],
				"validation": {
					"type": "boolean"
				}
			}
		},
		"/environment/add": {
			_apiInfo: {
				"l": "Add Environment",
				"group": "Environment"
			},
			"commonFields": ['description', 'services'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 4
				}
			},
			"domain": {
				"source": ['body.domain'],
				"required": true,
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
			"deployer": {
				"source": ['body.deployer'],
				"required": true,
				"validation": {
					"type": "object"
				}
			}
		},
		"/environment/delete": {
			_apiInfo: {
				"l": "Delete Environment",
				"group": "Environment"
			},
			"commonFields": ['id']
		},
		"/environment/update": {
			_apiInfo: {
				"l": "Update Environment",
				"group": "Environment"
			},
			"commonFields": ['id', 'description', 'services'],
			"domain": {
				"source": ['body.domain'],
				"required": true,
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
			"commonFields": ['id'],
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

		"/environment/dbs/list": {
			_apiInfo: {
				"l": "List Environment Databases",
				"group": "Environment Databases"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/dbs/add": {
			_apiInfo: {
				"l": "Add Environment Database",
				"group": "Environment Databases"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['body.name'], "required": true, "validation": {"type": "string", "required": true}},
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
		"/environment/dbs/update": {
			_apiInfo: {
				"l": "Update Environment Database",
				"group": "Environment Databases"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['body.name'], "required": true, "validation": {"type": "string", "required": true}},
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
		"/environment/dbs/delete": {
			_apiInfo: {
				"l": "Delete Environment Database",
				"group": "Environment Databases"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/dbs/updatePrefix": {
			_apiInfo: {
				"l": "Update Environment Databases Prefix",
				"group": "Environment Databases"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"prefix": {
				"source": ['body.prefix'],
				"required": false,
				"validation": {"type": "string", "required": false}
			}
		},

		"/environment/clusters/list": {
			_apiInfo: {
				"l": "List Environment Database Clusters",
				"group": "Environment Clusters"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/clusters/add": {
			_apiInfo: {
				"l": "Add Environment Database Cluster",
				"group": "Environment Clusters"
			},
			"commonFields": ['cluster'],
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/clusters/update": {
			_apiInfo: {
				"l": "Update Environment Database Cluster",
				"group": "Environment Clusters"
			},
			"commonFields": ['cluster'],
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/clusters/delete": {
			_apiInfo: {
				"l": "Delete Environment Database Cluster",
				"group": "Environment Clusters"
			},
			"env": {"source": ['query.env'], "required": true, "validation": {"type": "string", "required": true}},
			"name": {"source": ['query.name'], "required": true, "validation": {"type": "string", "required": true}}
		},
		"/environment/platforms/list": {
			_apiInfo: {
				"l": "List Environment Platforms",
				"group": "Environment Platforms"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string",
					"required": true
				}
			}
		},
		"/environment/platforms/cert/upload": {
			_apiInfo: {
				"l": "Upload Certificate",
				"group": "Environment Platforms"
			}
		},
		"/environment/platforms/cert/delete": {
			_apiInfo: {
				"l": "Remove Certificate",
				"group": "Environment Platforms"
			},
			"id": {
				"source": ['query.id'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"env": {
				"source": ['query.env'],
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
		"/environment/platforms/cert/choose": {
			_apiInfo: {
				"l": "Choose Existing Certificates",
				"group": "Environment Platforms"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string",
					"required": true
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
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string",
					"required": true
				}
			},
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
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string",
					"required": true
				}
			},
			"deployerType": {
				"source": ['body.deployerType'],
				"required": true,
				"validation": {
					"type": "string",
					"enum": ["manual", "container"]
				}
			}
		},
		"/environment/nginx/cert/upload": {
			_apiInfo: {
				"l": "Upload Nginx Certificates",
				"group": "Environment Platforms"
			}
		},
		"/environment/nginx/cert/list": {
			_apiInfo: {
				"l": "List Nginx Certificates",
				"group": "Environment Platforms"
			}
		},
		"/environment/nginx/cert/delete": {
			_apiInfo: {
				"l": "Delete Nginx Certificates",
				"group": "Environment Platforms"
			},
			"id": {
				"source": ['query.id'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/environment/nginx/cert/choose": {
			_apiInfo: {
				"l": "Choose Existing Nginx Certificates",
				"group": "Environment Platforms"
			},
			"env": {
				"source": ['query.env'],
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

		"/product/list": {
			_apiInfo: {
				"l": "List Products",
				"group": "Product",
				"groupMain": true
			}
		},
		"/product/get": {
			_apiInfo: {
				"l": "Get Product",
				"group": "Product"
			},
			"commonFields": ['id']
		},
		"/product/add": {
			_apiInfo: {
				"l": "Add Product",
				"group": "Product"
			},
			"commonFields": ['description', 'name'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 6
				}
			}
		},
		"/product/delete": {
			_apiInfo: {
				"l": "Delete Product",
				"group": "Product"
			},
			"commonFields": ['id']
		},
		"/product/update": {
			_apiInfo: {
				"l": "Update Product",
				"group": "Product"
			},
			"commonFields": ['id', 'name', 'description']
		},

		"/product/packages/delete": {
			_apiInfo: {
				"l": "Delete Product Package",
				"group": "Product"
			},
			"commonFields": ['id'],
			"code": {
				"source": ['query.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric"
				}
			}
		},
		"/product/packages/list": {
			_apiInfo: {
				"l": "List Product Packages",
				"group": "Product"
			},
			"commonFields": ['id']
		},
		"/product/packages/get": {
			_apiInfo: {
				"l": "Get Product Package",
				"group": "Product"
			},
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
		"/product/packages/add": {
			_apiInfo: {
				"l": "Add Product Package",
				"group": "Product"
			},
			"commonFields": ['id', 'name', 'description', '_TTL', 'acl'],
			"code": {
				"source": ["body.code"],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"minLength": 4,
					"maxLength": 6
				}
			}
		},
		"/product/packages/update": {
			_apiInfo: {
				"l": "Update Product Package",
				"group": "Product"
			},
			"commonFields": ['id', 'name', 'description', '_TTL', 'acl'],
			"code": {
				"source": ["query.code"],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric"
				}
			}
		},

		"/permissions/get": {
			_apiInfo: {
				"l": "Get Tenant Security Permissions",
				"group": "Tenant"
			},
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
			}
		},

		"/tenant/list": {
			_apiInfo: {
				"l": "List Tenants",
				"group": "Tenant",
				"groupMain": true
			},
			"type": {
				"source": ['query.type'],
				"required": false,
				"validation": {
					"type": "string",
					"enum": ["admin", "product", "client"]
				}
			}
		},
		"/tenant/add": {
			_apiInfo: {
				"l": "Add Tenant",
				"group": "Tenant"
			},
			"commonFields": ['name', 'description'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 4
				}
			},
			"email": {
				"source": ['body.email'],
				"required": true,
				"validation": {
					"type": "email"
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
		"/tenant/delete": {
			_apiInfo: {
				"l": "Delete Tenant",
				"group": "Tenant"
			},
			"commonFields": ['id']
		},
		"/tenant/get": {
			_apiInfo: {
				"l": "Get Tenant",
				"group": "Tenant"
			},
			"commonFields": ['id']
		},
		"/tenant/update": {
			_apiInfo: {
				"l": "Update Tenant",
				"group": "Tenant"
			},
			"commonFields": ['id', 'name', 'description'],
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

		"/tenant/oauth/list": {
			_apiInfo: {
				"l": "Get Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id']
		},
		"/tenant/oauth/delete": {
			_apiInfo: {
				"l": "Delete Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id']
		},
		"/tenant/oauth/add": {
			_apiInfo: {
				"l": "Add Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id', 'secret', 'redirectURI']
		},
		"/tenant/oauth/update": {
			_apiInfo: {
				"l": "Update Tenant oAuth Configuration",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id', 'secret', 'redirectURI']
		},

		"/tenant/oauth/users/list": {
			_apiInfo: {
				"l": "List Tenant oAuth Users",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id']
		},
		"/tenant/oauth/users/delete": {
			_apiInfo: {
				"l": "Delete Tenant oAuth User",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id', 'uId']
		},
		"/tenant/oauth/users/add": {
			_apiInfo: {
				"l": "Add Tenant oAuth User",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id', 'userId', 'password']
		},
		"/tenant/oauth/users/update": {
			_apiInfo: {
				"l": "Update Tenant oAuth User",
				"group": "Tenant oAuth"
			},
			"commonFields": ['id', 'uId'],
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

		"/tenant/application/list": {
			_apiInfo: {
				"l": "List Tenant Applications",
				"group": "Tenant Application"
			},
			"commonFields": ['id']
		},
		"/tenant/application/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/add": {
			_apiInfo: {
				"l": "Add Tenant Application",
				"group": "Tenant Application"
			},
			"commonFields": ['id', '_TTL', 'description', 'acl', 'productCode', 'packageCode']
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
			"commonFields": ['id', 'appId', 'description', 'acl', 'productCode', 'packageCode', 'clearAcl']
		},
		"/tenant/acl/get": {
			_apiInfo: {
				"l": "Get Current Tenant Access Level",
				"group": "Tenant"
			},
			"commonFields": ['id']
		},

		"/tenant/application/key/add": {
			_apiInfo: {
				"l": "Add Tenant Application Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/key/list": {
			_apiInfo: {
				"l": "List Tenant Application Keys",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/key/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key']
		},

		"/tenant/application/key/ext/list": {
			_apiInfo: {
				"l": "List Tenant Application External Keys",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key']
		},
		"/tenant/application/key/ext/add": {
			_apiInfo: {
				"l": "Add Tenant Application External Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key', 'expDate', 'device', 'geo'],
			"env": {
				"source": ['body.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/tenant/application/key/ext/update": {
			_apiInfo: {
				"l": "Update Tenant Application External Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key', 'extKey', 'expDate', 'device', 'geo'],
			"extKeyEnv": {
				"source": ['query.extKeyEnv'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/tenant/application/key/ext/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application External Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key', 'extKey'],
			"extKeyEnv": {
				"source": ['body.extKeyEnv'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/tenant/application/key/config/list": {
			_apiInfo: {
				"l": "List Tenant Application Key Configuration",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key']
		},
		"/tenant/application/key/config/update": {
			_apiInfo: {
				"l": "Update Tenant Application Key Configuration",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key', 'envCode', 'config']
		},

		"/tenant/db/keys/list": {
			_apiInfo: {
				"l": "List Dashboard Tenant Keys",
				"group": "Dashboard Tenants",
				"groupMain": true
			}
		},

		"/settings/tenant/get": {
			_apiInfo: {
				"l": "Get Tenant",
				"group": "Tenant Settings"
			}
		},
		"/settings/tenant/update": {
			_apiInfo: {
				"l": "Update Tenant",
				"group": "Tenant Settings"
			},
			"commonFields": ['name', 'description']
		},

		"/settings/tenant/oauth/list": {
			_apiInfo: {
				"l": "Get Tenant oAuth Configuration",
				"group": "Tenant Settings"
			}
		},
		"/settings/tenant/oauth/delete": {
			_apiInfo: {
				"l": "Delete Tenant oAuth Configuration",
				"group": "Tenant Settings"
			}
		},
		"/settings/tenant/oauth/add": {
			_apiInfo: {
				"l": "Add Tenant oAuth Configuration",
				"group": "Tenant Settings"
			},
			"commonFields": ['secret', 'redirectURI']
		},
		"/settings/tenant/oauth/update": {
			_apiInfo: {
				"l": "Update Tenant oAuth Configuration",
				"group": "Tenant Settings"
			},
			"commonFields": ['secret', 'redirectURI']
		},

		"/settings/tenant/oauth/users/list": {
			_apiInfo: {
				"l": "List Tenant oAuth Users",
				"group": "Tenant Settings"
			}
		},
		"/settings/tenant/oauth/users/delete": {
			_apiInfo: {
				"l": "Delete Tenant oAuth User",
				"group": "Tenant Settings"
			},
			"commonFields": ['uId']
		},
		"/settings/tenant/oauth/users/add": {
			_apiInfo: {
				"l": "Add Tenant oAuth User",
				"group": "Tenant Settings"
			},
			"commonFields": ['userId', 'password']
		},
		"/settings/tenant/oauth/users/update": {
			_apiInfo: {
				"l": "Update Tenant oAuth User",
				"group": "Tenant Settings"
			},
			"commonFields": ['uId'],
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

		"/settings/tenant/application/list": {
			_apiInfo: {
				"l": "List Tenant Applications",
				"group": "Tenant Settings"
			}
		},

		"/settings/tenant/application/key/add": {
			_apiInfo: {
				"l": "Add Tenant Application Key",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId']
		},
		"/settings/tenant/application/key/list": {
			_apiInfo: {
				"l": "List Tenant Application Keys",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId']
		},
		"/settings/tenant/application/key/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application Key",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId', 'key']
		},

		"/settings/tenant/application/key/ext/list": {
			_apiInfo: {
				"l": "List Tenant Application External Keys",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId', 'key']
		},
		"/settings/tenant/application/key/ext/add": {
			_apiInfo: {
				"l": "Add Tenant Application External Key",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId', 'key', 'expDate', 'device', 'geo'],
			"env": {
				"source": ['body.env'],
				"required": true,
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
			"commonFields": ['appId', 'key', 'extKey', 'expDate', 'device', 'geo'],
			"extKeyEnv": {
				"source": ['query.extKeyEnv'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/settings/tenant/application/key/ext/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application External Key",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId', 'key', 'extKey'],
			"extKeyEnv": {
				"source": ['body.extKeyEnv'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/settings/tenant/application/key/config/list": {
			_apiInfo: {
				"l": "List Tenant Application Key Configuration",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId', 'key']
		},
		"/settings/tenant/application/key/config/update": {
			_apiInfo: {
				"l": "Update Tenant Application Key Configuration",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId', 'key', 'envCode', 'config']
		},

		"/services/list": {
			_apiInfo: {
				"l": "List Services",
				"group": "Services"
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

		"/daemons/list": {
			_apiInfo: {
				"l": "List Daemons",
				"group": "Daemons"
			},
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

		"/daemons/groupConfig/list": {
			_apiInfo: {
				"l": "List Daemon Group Configuration",
				"group": "Daemons"
			},
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
			'commonFields': ['groupName', 'daemon', 'interval', 'status', 'processing', 'jobs', 'order', 'solo']
		},
		"/daemons/groupConfig/update": {
			_apiInfo: {
				"l": "Update Daemon Group Configuration",
				"group": "Daemons"
			},
			'commonFields': ['id', 'groupName', 'daemon', 'interval', 'status', 'processing', 'jobs', 'order', 'solo']
		},
		"/daemons/groupConfig/delete": {
			_apiInfo: {
				"l": "Delete Daemon Group Configuration",
				"group": "Daemons"
			},
			'commonFields': ['id']
		},

		"/daemons/groupConfig/serviceConfig/update": {
			_apiInfo: {
				"l": "Update Service Configuration",
				"group": "Daemons"
			},
			'commonFields': ['id', 'jobName'],
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
		"/daemons/groupConfig/serviceConfig/list": {
			_apiInfo: {
				"l": "List Service Configuration",
				"group": "Daemons"
			},
			'commonFields': ['id', 'jobName']
		},

		"/daemons/groupConfig/tenantExtKeys/update": {
			_apiInfo: {
				"l": "Update Job's External Keys",
				"group": "Daemons"
			},
			'commonFields': ['id', 'jobName'],
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
		"/daemons/groupConfig/tenantExtKeys/list": {
			_apiInfo: {
				"l": "List Job's External Keys",
				"group": "Daemons"
			},
			'commonFields': ['id', 'jobName']
		},

		"/staticContent/list": {
			_apiInfo: {
				"l": "List Static Content",
				"group": "Static Content"
			},
			'staticContentNames': {
				'source': ['body.staticContentNames'],
				'required': false,
				'validation': {
					'type': 'array',
					'items': {'type': 'string'}
				}
			}
		},

		"/hosts/list": {
			_apiInfo: {
				"l": "List Hosts",
				"group": "Hosts",
				"groupMain": true
			},
			'env': {
				'source': ['query.env'],
				'required': true,
				"validation": {
					"type": "string",
					"required": true
				}
			}
		},
		"/hosts/nginx/list": {
			_apiInfo: {
				'l': 'List Nginx Hosts',
				'group': 'Hosts'
			},
			'env': {
				'source': ['query.env'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			}
		},
		"/hosts/nginx/redeploy": {
			_apiInfo: {
				'l': 'Redeploy Nginx Hosts',
				'group': 'Hosts'
			},
			'envCode': {
				'source': ['query.envCode'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			},
			"ssl":{
				'source': ['body.ssl'],
				'required': true,
				'validation': {
					'type': 'boolean'
				}
			},
			"nginxConfig": {
				"source": ["body.nginxConfig"],
				"required": false,
				"validation": {
					"type": "object",
					"properties": {
						"customUIId": {"type": "string", "required": true},
						"branch": {"type": "string", "required": true},
						"commit": {"type": "string", "required": true}
					}
				}
			},
			"cid": {
				"source": ['query.cid'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/hosts/delete": {
			_apiInfo: {
				"l": "Delete Hosts",
				"group": "Hosts"
			},
			'env': {
				'source': ['query.env'],
				'required': true,
				"validation": {
					"type": "string",
					"required": true
				}
			},
			'name': {
				'source': ['query.name'],
				'required': true,
				"validation": {
					"type": "string",
					"required": true
				}
			},
			'hostname': {
				'source': ['query.hostname'],
				'required': true,
				"validation": {
					"type": "string",
					"required": true
				}
			},
			'ip': {
				'source': ['query.ip'],
				'required': true,
				"validation": {
					"type": "string",
					"required": true
				}
			}
		},
		"/hosts/maintenanceOperation": {
			"_apiInfo": {
				"l": "Perform Maintenance Operation",
				"group": "Hosts"
			},
			"operation": {
				"required": true,
				"source": ['body.operation'],
				"validation": {
					"type": "string",
					"enum": ["heartbeat", "reloadRegistry", "loadProvision", "awarenessStat", 'hostLogs', 'infoHost', 'daemonStats']
				}
			},
			"serviceName": {
				"source": ['body.serviceName'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"serviceHost": {
				"source": ['body.serviceHost'],
				"required": false,
				"validation": {
					"type": "string"
				}
			},
			"servicePort": {
				"source": ['body.servicePort'],
				"required": true,
				"validation": {
					"type": "integer",
					"min": 4000
				}
			},
			"env": {
				"source": ['body.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"hostname": {
				"source": ['body.hostname'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/hosts/deployController": {
			"_apiInfo": {
				"l": "Deploy New Controller",
				"group": "Hosts"
			},
			"commonFields": ['envCode'],
			"number": {
				"required": true,
				"source": ["body.number"],
				"validation": {
					"type": "number",
					"minimum": 1
				}
			},
			"version": {
				"required": true,
				"source": ["body.version"],
				"default": 1,
				"validation": {
					"type": "number",
					"minimum": 1
				}
			},
			"variables": {
				"required": false,
				"source": ['body.variables'],
				"validation": {
					"type": "array",
					"minItems": 1,
					"items": {"type": "string"}
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
			"useLocalSOAJS": {
				"source": ['body.useLocalSOAJS'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"name": {
				"source": ['body.name'],
				"required": false,
				"validation": {
					"type": "string"
				}
			},
			"haService": {
				"source": ['body.haService'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"haCount": {
				"source": ['body.haCount'],
				"required": false,
				"validation": {
					"type": "number"
				}
			},
			"memoryLimit": {
				"source": ['body.memoryLimit'],
				"required": false,
				"default": 209715200,
				"validation": {
					"type": "number"
				}
			}
		},
		"/hosts/deployNginx": {
			"_apiInfo": {
				"l": "Deploy New Nginx",
				"group": "Hosts"
			},
			"commonFields": ['envCode'],
			"nginxConfig": {
				"source": ["body.nginxConfig"],
				"required": false,
				"validation": {
					"type": "object",
					"properties": {
						"customUIId": {"type": "string", "required": true},
						"branch": {"type": "string", "required": true},
						"commit": {"type": "string", "required": true}
					}
				}
			},
			"exposedPort": {
				"source": ["body.exposedPort"],
				"required": false,
				"validation":{
					"type":"number"
				}
			},
			"supportSSL": {
				"source": ['body.supportSSL'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"haService": {
				"source": ['body.haService'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"haCount": {
				"source": ['body.haCount'],
				"required": false,
				"validation": {
					"type": "number"
				}
			},
			"memoryLimit": {
				"source": ['body.memoryLimit'],
				"required": false,
				"default": 209715200,
				"validation": {
					"type": "number"
				}
			}
		},
		"/hosts/updateNginx": {
			"_apiInfo": {
				"l": "Deploy New Nginx",
				"group": "Hosts"
			},
			"commonFields": ['envCode']
		},
		"/hosts/deployService": {
			"_apiInfo": {
				"l": "Deploy New Service",
				"group": "Hosts"
			},
			"commonFields": ['envCode'],
			"name": {
				"required": false,
				"source": ['body.name'],
				"validation": {
					"type": "string"
				}
			},
			"version": {
				"required": true,
				"source": ["body.version"],
				"default": 1,
				"validation": {
					"type": "number",
					"minimum": 1
				}
			},
			"gcName": {
				"required": false,
				"source": ['body.gcName'],
				"validation": {
					"type": "string"
				}
			},
			"gcVersion": {
				"required": false,
				"source": ['body.gcVersion'],
				"validation": {
					"type": "integer",
					"minimum": 1
				}
			},
			"variables": {
				"required": false,
				"source": ['body.variables'],
				"validation": {
					"type": "array",
					"minItems": 1,
					"items": {"type": "string"}
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
			"useLocalSOAJS": {
				"source": ['body.useLocalSOAJS'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"haService": {
				"source": ['body.haService'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			},
			"haCount": {
				"source": ['body.haCount'],
				"required": false,
				"validation": {
					"type": "number"
				}
			},
			"memoryLimit": {
				"source": ['body.memoryLimit'],
				"required": false,
				"default": 209715200,
				"validation": {
					"type": "number"
				}
			}
		},
		"/hosts/deployDaemon": {
			"_apiInfo": {
				"l": "Deploy New Daemon",
				"group": "Hosts"
			},
			"commonFields": ['envCode'],
			"name": {
				"required": false,
				"source": ['body.name'],
				"validation": {
					"type": "string"
				}
			},
			"version": {
				"required": true,
				"source": ["body.version"],
				"default": 1,
				"validation": {
					"type": "number",
					"minimum": 1
				}
			},
			"variables": {
				"required": false,
				"source": ['body.variables'],
				"validation": {
					"type": "array",
					"minItems": 1,
					"items": {"type": "string"}
				}
			},
			"grpConfName": {
				"required": true,
				"source": ['body.grpConfName'],
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
			"useLocalSOAJS": {
				"source": ['body.useLocalSOAJS'],
				"required": false,
				"validation": {
					"type": "boolean"
				}
			}
		},
		"/hosts/container/logs": {
			"_apiInfo": {
				"l": "Get Container Logs",
				"group": "Hosts"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"cid": {
				"source": ['query.cid'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/hosts/container/delete": {
			"_apiInfo": {
				"l": "Delete Container",
				"group": "Hosts"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"cid": {
				"source": ['query.cid'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/hosts/container/zombie/list": {
			"_apiInfo": {
				"l": "List Zombie Containers",
				"group": "Hosts"
			},
			"env": {
				"source": ["query.env"],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/hosts/container/zombie/delete": {
			"_apiInfo": {
				"l": "Delete Zombie Container",
				"group": "Hosts"
			},
			"env": {
				"source": ["query.env"],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"cid": {
				"source": ['query.cid'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/hacloud/nodes/list": {
			"_apiInfo": {
				"l": "List HA Cloud Nodes",
				"group": "HA Cloud"
			}
		},
		"/hacloud/nodes/add": {
			"_apiInfo": {
				"l": "Add HA Cloud Node",
				"group": "HA Cloud"
			},
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
				"required": true,
				"validation": {
					"type": "number"
				}
			},
			"role": {
				"source": ['body.role'],
				"required": true,
				"validation": {
					"type": "string",
					"enum": ['manager', 'worker']
				}
			}
		},
		"/hacloud/nodes/remove": {
			"_apiInfo": {
				"l": "Remove HA Cloud Node",
				"group": "HA Cloud"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"nodeId": {
				"source": ['query.nodeId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/hacloud/nodes/update": {
			"_apiInfo": {
				"l": "Update HA Cloud Node",
				"group": "HA Cloud"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
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

		"/hacloud/services/scale": {
			"_apiInfo": {
				"l": "Scale HA Service",
				"group": "HA Cloud"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"name": {
				"source": ['query.name'],
				"required": true,
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
			"scale": {
				"source": ['body.scale'],
				"required": true,
				"validation": {
					"type": "number"
				}
			}
		},

		"/hacloud/services/delete": {
			"_apiInfo": {
				"l": "Delete HA Service",
				"group": "HA Cloud"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"name": {
				"source": ['query.name'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"version": {
				"source": ['query.version'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/hacloud/services/instances/logs": {
			"_apiInfo": {
				"l": "Get Service Container Logs",
				"group": "HA Cloud"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"taskName": {
				"source": ['query.taskName'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/analytics/check": {
			"_apiInfo": {
				"l": "Check Analytics Status",
				"group": "Analytics"
			},
			"env": {
				"source": ['query.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/analytics/activate": {
			"_apiInfo": {
				"l": "Activate Analytics",
				"group": "Analytics"
			},
			"env": {
				"source": ['body.env'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/gitAccounts/login": {
			"_apiInfo": {
				"l": "Github Login",
				"group": "Git Accounts"
			},
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
			}
		},
		"/gitAccounts/logout": {
			"_apiInfo": {
				"l": "Github Logout",
				"group": "Git Accounts"
			},
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
		"/gitAccounts/accounts/list": {
			"_apiInfo": {
				"l": "List Git Accounts",
				"group": "Git Accounts"
			}
		},
		"/gitAccounts/getRepos": {
			"_apiInfo": {
				"l": "Get Repositories",
				"group": "Git Accounts"
			},
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
			}
		},

		"/gitAccounts/getBranches": {
			"_apiInfo": {
				"l": "Get Repository Branches",
				"group": "Git Accounts"
			},
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
		"/gitAccounts/repo/activate": {
			"_apiInfo": {
				"l": "Activate Repository",
				"group": "Git Accounts"
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
			},
			"owner": {
				"source": ['body.owner'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"project": {
				"source": ['body.project'],
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
			"configBranch": {
				"source": ['body.configBranch'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/gitAccounts/repo/deactivate": {
			"_apiInfo": {
				"l": "Deactivate Repository",
				"group": "Git Accounts"
			},
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
		},
		"/gitAccounts/repo/sync": {
			"_apiInfo": {
				"l": "Deactivate Repository",
				"group": "Git Accounts"
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

		"/cb/list": {
			"_apiInfo": {
				"l": "List Content Schema",
				"group": "Content Builder",
				"groupMain": true
			},
			'port': {
				'required': false,
				'source': ['query.port'],
				'validation': {
					'type': 'boolean'
				}
			}
		},
		"/cb/add": {
			"_apiInfo": {
				"l": "Add New Content Schema",
				"group": "Content Builder"
			},
			"commonFields": ["name"],
			"config": {
				"required": true,
				"source": ["body.config"],
				"validation": cbSchema
			}
		},
		"/cb/update": {
			"_apiInfo": {
				"l": "Update Content Schema",
				"group": "Content Builder"
			},
			"commonFields": ["id"],
			"config": {
				"required": true,
				"source": ["body.config"],
				"validation": cbSchema
			}
		},
		"/cb/get": {
			"_apiInfo": {
				"l": "Get One Content Schema",
				"group": "Content Builder"
			},
			"commonFields": ["id"],
			"version": {
				"required": false,
				"source": ["query.version"],
				"validation": {
					"type": "integer"
				}
			}
		},
		"/cb/listRevisions": {
			"_apiInfo": {
				"l": "List Content Schema Revisions",
				"group": "Content Builder"
			}
		}
	}
};
