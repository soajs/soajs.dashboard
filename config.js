'use strict';
var serviceConfig = require("./schemas/serviceConfig");
var cbSchema = require("./schemas/cb");
var aclSchema = require("./schemas/acl");

module.exports = {
	"serviceName": "dashboard",
	serviceGroup: "SOAJS Core Services",
	"servicePort": 4003,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"extKeyRequired": true,
	"awareness": true,
	"awarenessEnv": true,

	"hasher": {
		"hashIterations": 1024,
		"seedLength": 32
	},
	"expDateTTL": 86400000,
	"ncpLimit": 16,

	"profileLocation": process.env.SOAJS_PROFILE_LOC || "/opt/soajs/FILES/profiles/",

	"images": {
		"nginx": 'soajsorg/nginx',
		"services": "soajsorg/soajs"
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
						"URLParam": {"type": "object", "properties": {}},
						"servers": {"type": "array", "items": {"type": "object", "required": true}},
						"extraParam": {"type": "object", "properties": {}}
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

			"port": {
				"required": true,
				"source": ["body.port"],
				"validation": {
					"type": "integer"
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
			"commonFields": ['description', 'services', 'port'],
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
			"commonFields": ['id', 'description', 'services', 'port'],
			"domain": {
				"source": ['body.domain'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "hostname"
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
		"/environment/platforms/cert/delete": {
			_apiInfo: {
				"l": "Remove Certificate",
				"group": "Environment"
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
				"group": "Environment"
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
		"/environment/platforms/driver/add": {
			_apiInfo: {
				"l": "Add Driver",
				"group": "Environment"
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
			"local": {
				"source": ['body.local'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			"cloud": {
				"source": ['body.cloud'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			"socket": {
				"source": ['body.socket'],
				"required": false,
				"validation": {
					"type": "object"
				}
			}
		},
		"/environment/platforms/driver/edit": {
			_apiInfo: {
				"l": "Update Driver",
				"group": "Environment"
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
			"local": {
				"source": ['body.local'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			"cloud": {
				"source": ['body.cloud'],
				"required": false,
				"validation": {
					"type": "object"
				}
			},
			"socket": {
				"source": ['body.socket'],
				"required": false,
				"validation": {
					"type": "object"
				}
			}
		},
		"/environment/platforms/driver/delete": {
			_apiInfo: {
				"l": "Delete Driver Configuration",
				"group": "Environment"
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
			}
		},
		"/environment/platforms/driver/changeSelected": {
			_apiInfo: {
				"l": "Change Selected Driver",
				"group": "Environment"
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
				"group": "Environment"
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
					"maxLength": 5
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
			"commonFields": ['id', 'appId', 'key', 'extKey', 'expDate', 'device', 'geo']
		},
		"/tenant/application/key/ext/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application External Key",
				"group": "Tenant Application"
			},
			"commonFields": ['id', 'appId', 'key', 'extKey']
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
			"commonFields": ['appId', 'key', 'extKey', 'expDate', 'device', 'geo']
		},
		"/settings/tenant/application/key/ext/delete": {
			_apiInfo: {
				"l": "Delete Tenant Application External Key",
				"group": "Tenant Settings"
			},
			"commonFields": ['appId', 'key', 'extKey']
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
		"/daemons/delete": {
			_apiInfo: {
				"l": "Delete Daemon",
				"group": "Daemons"
			},
			'commonFields': ['id']
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
		"/staticContent/add": {
			_apiInfo: {
				"l": "Add Static Content",
				"group": "Static Content"
			},
			'commonFields': ['name', 'type', 'owner', 'repo', 'branch', 'main', 'token']
		},
		"/staticContent/update": {
			_apiInfo: {
				"l": "Update Static Content",
				"group": "Static Content"
			},
			'commonFields': ['name', 'type', 'owner', 'repo', 'branch', 'main', 'token'],
			'id': {
				'source': ['query.id'],
				'required': true,
				'validation': {
					'type': 'string'
				}
			}
		},
		"/staticContent/delete": {
			_apiInfo: {
				"l": "Delete Static Content",
				"group": "Static Content"
			},
			'id': {
				'source': ['query.id'],
				'required': true,
				'validation': {
					'type': 'string'
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
			"nginxConfig": {
				"source": ["body.nginxConfig"],
				"required": false,
				"validation": {
					"type": "object",
					"properties": {
						"customUIId": {"type": "string", "required": false},
						"branch": {"type": "string", "required": false},
						"commit": {"type": "string", "required": false}
					}
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
			}
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
			}
		},
		"/hosts/ContainersNoHost": {
			"_apiInfo": {
				"l": "List Containers that have no host.",
				"group": "Hosts"
			},
			"commonFields": ['envCode']
		},

		"/github/login": {
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
		"/github/logout": {
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
		"/github/getRepos": {
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
			}
		},

		"/github/getBranches": {
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
			}
		},
		"/github/repo/activate": {
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
		"/github/repo/deactivate": {
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
		"/github/repo/sync": {
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