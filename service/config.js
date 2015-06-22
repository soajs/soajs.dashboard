'use strict';
var serviceConfig = require("./schemas/serviceConfig");
var cbSchema = require("./schemas/cb");
var aclSchema = require("./schemas/acl");

module.exports = {
	"serviceName": "dashboard",
	"servicePort": 4003,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"extKeyRequired": true,
	"awareness": true,

	"images":{
		"nginx": 'local/nginxapi',
		"controller": "local/controller"
	},

	"hasher": {
		"hashIterations": 1024,
		"seedLength": 32
	},
	"expDateTTL": 86400000,

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
					"format": "alphanumeric",
					"maxLength": 5
				}
			},
			"packageCode": {
				"source": ['body.packageCode'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
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
						"selected": {"required": true, "type": "string", "enum": ['unix', 'boot2docker', 'joyent', 'aws', 'gCloud', 'azure']},
						"additionalProperties": {
							"type": "object"
						}
					}
				}
			}
		},
		"/environment/list": {
			_apiInfo: {
				"l": "List Environments",
				"group": "Environment",
				"groupMain": true
			}
		},
		"/environment/add": {
			_apiInfo: {
				"l": "Add Environment",
				"group": "Environment"
			},
			"commonFields": ['description', 'services', 'deployer'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 4
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
			"commonFields": ['id', 'description', 'services', 'deployer']
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
			"cluster": {"source": ['body.cluster'], "required": true, "validation": {"type": "string", "required": true}},
			"tenantSpecific": {"source": ['body.tenantSpecific'], "required": false, "validation": {"type": "boolean", "required": true}},
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
			"cluster": {"source": ['body.cluster'], "required": true, "validation": {"type": "string", "required": true}},
			"tenantSpecific": {"source": ['body.tenantSpecific'], "required": false, "validation": {"type": "boolean", "required": true}},
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
			"prefix": {"source": ['body.prefix'], "required": false, "validation": {"type": "string", "required": false}}
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
					"format": "alphanumeric",
					"maxLength": 5
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
					"format": "alphanumeric",
					"maxLength": 6
				}
			}
		},

		"/tenant/permissions/get": {
			_apiInfo: {
				"l": "Get Tenant Security Permissions",
				"group": "Tenant"
			}
		},
		"/tenant/list": {
			_apiInfo: {
				"l": "List Tenants",
				"group": "Tenant",
				"groupMain": true
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
			"commonFields": ['id', 'name', 'description']
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
			"commonFields": ['id', 'appId', '_TTL', 'description', 'acl', 'productCode', 'packageCode', 'clearAcl']
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
			"commonFields": ['id', 'appId', 'key', 'expDate', 'device', 'geo']
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
			"commonFields": ['appId', 'key', 'expDate', 'device', 'geo']
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
		"/services/update": {
			_apiInfo: {
				"l": "Update Service",
				"group": "Services"
			},
			'name': {
				'source': ['query.name'],
				'required': true,
				"validation": {
					"type": "string"
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
			"image": {
				"required": false,
				"source": ["body.image"],
				"validation": {
					"type": "string"
				}
			}
		},
		"/services/create": {
			_apiInfo: {
				"l": "Create Custom Service",
				"group": "Services"
			},
			'name': {
				'source': ['body.name'],
				'required': true,
				"validation": {
					"type": "string"
				}
			},
			'folder': {
				'source': ['body.folder'],
				'required': true,
				"validation": {
					"type": "string",
					"pattern": "^(/[^/]+)+$"
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
					"enum": ["heartbeat", "reloadRegistry", "loadProvision", "awarenessStat", 'infoHost', 'startHost', 'stopHost']
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
			}
		},
		"/hosts/deployService": {
			"_apiInfo": {
				"l": "Deploy New Service",
				"group": "Hosts"
			},
			"commonFields": ['envCode'],
			"image": {
				"required": true,
				"source": ["body.image"],
				"validation": {
					"type": "string"
				}
			},
			"name": {
				"required": false,
				"source": ['body.name'],
				"validation": {
					"type": "string"
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