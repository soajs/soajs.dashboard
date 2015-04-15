'use strict';
var accessSchema = {
	"oneOf": [
		{"type": "boolean", "required": false},
		{"type": "array", "minItems": 1, "items": {"type": "string", "required": true}, "required": false}
	]
};

module.exports = {
	"serviceName": "dashboard",
	"expDateTTL": 86400000,
	"hasher":{
		"hashIterations": 1024,
		"seedLength": 32
	},

	"errors": {
		"400": "Unable to add the environment record",
		"401": "Unable to update the environment record",
		"402": "Unable to get the environment records",
		"403": "Environment already exists",
		"404": "Unable to remove environment record",
		"405": "Invalid environment id provided",

		"409": "Invalid product id provided",
		"410": "Unable to add the product record",
		"411": "Unable to update the product record",
		"412": "Unable to get the product record",
		"413": "Product already exists",
		"414": "Unable to remove product record",
		"415": "Unable to add the product package",
		"416": "Unable to update the product package",
		"417": "Unable to get the product packages",
		"418": "Product package already exists",
		"419": "Unable to remove product package",

		"420": "Unable to add the tenant record",
		"421": "Unable to update the tenant record",
		"422": "Unable to get the tenant records",
		"423": "Tenant already exists",
		"424": "Unable to remove tenant record",

		"425": "Unable to add the tenant OAuth",
		"426": "Unable to update the tenant OAuth",
		"427": "Unable to get the tenant OAuth",
		"428": "Unable to remove tenant OAuth",

		"429": "Unable to add the tenant application",
		"430": "Unable to update the tenant application",
		"431": "Unable to get the tenant application",
		"432": "Unable to remove tenant application",
		"433": "Tenant application already exist",
		"434": "Invalid product code or package code provided",

		"435": "Unable to get the tenant application keys",
		"436": "Unable to add a new key to the tenant application",
		"437": "Unable to remove key from the tenant application",
		"438": "Invalid tenant Id provided",
		"439": "Invalid tenant oauth user Id provided",

		"440": "Unable to add the tenant application ext Key",
		"441": "Unable to update the tenant application ext Key",
		"442": "Unable to get the tenant application ext Keys",
		"443": "Unable to remove tenant application ext Key",
		"444": "Unable to get the tenant application configuration",
		"445": "Unable to update the tenant application configuration",
		"446": "Invalid environment provided",

		"447": "Unable to get tenant oAuth Users",
		"448": "tenant oAuth User already exists",
		"449": "Unable to add tenant oAuth User",
		"450": "Unable to remove tenant oAuth User",
		"451": "Unable to updated tenant oAuth User",

		"500": "This record is locked. You cannot delete it",
		"501": "This record is locked. You cannot modify or delete it",
		"600": "Database error"
	},

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
			'acl': {
				'source': ['body.acl'],
				'required': false,
				'validation': {
					"type": "object",
					"additionalProperties": {
						"type": "object",
						"required": false,
						"properties": {
							"access": accessSchema,
							"apisPermission": {"type": "string", "enum": ["restricted"], "required": false},
							"apis": {
								"type": "object",
								"required": false,
								"patternProperties": {
									"^[_a-z\/][_a-zA-Z0-9\/:]*$": { //pattern to match an api route
										"type": "object",
										"required": true,
										"properties": {
											"access": accessSchema
										},
										"additionalProperties": false
									}
								}
							},
							"apisRegExp": {
								"type": "array",
								"required": false,
								"minItems": 1,
								"items": {
									"type": "object",
									"properties": {
										"regExp": {"type": "pattern", required: true, "pattern": /\.+/},
										"access": accessSchema
									},
									"additionalProperties": false
								}
							}
						},
						"additionalProperties": false
					}
				}
			}
		},
		"/environment/list": {},
		"/environment/add": {
			"commonFields": ['description'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 4
				}
			},
			"ips": {
				"source": ['body.ips'],
				"required": true,
				"validation": {
					"type": "array",
					'items': {'type': 'string'}
				}
			}
		},
		"/environment/delete": {
			"commonFields": ['id']
		},
		"/environment/update": {
			"commonFields": ['id', 'description'],
			"ips": {
				"source": ['body.ips'],
				"required": true,
				"validation": {
					"type": "array",
					'items': {'type': 'string'}
				}
			}
		},

		"/product/list": {},
		"/product/get": {
			"commonFields": ['id']
		},
		"/product/add": {
			"commonFields": ['description', 'name'],
			"code": {
				"source": ['body.code'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/product/delete": {
			"commonFields": ['id']
		},
		"/product/update": {
			"commonFields": ['id', 'name', 'description']
		},

		"/product/packages/delete": {
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
			"commonFields": ['id']
		},
		"/product/packages/add": {
			"commonFields": ['id', 'name', 'description', '_TTL', 'acl'],
			"code": {
				"source": ["body.code"],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},
		"/product/packages/update": {
			"commonFields": ['id', 'name', 'description', '_TTL', 'acl'],
			"code": {
				"source": ["query.code"],
				"required": true,
				"validation": {
					"type": "string",
					"format": "alphanumeric",
					"maxLength": 5
				}
			}
		},

		"/tenant/list": {},
		"/tenant/get": {
			"commonFields": ['id']
		},
		"/tenant/add": {
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
			"commonFields": ['id']
		},
		"/tenant/update": {
			"commonFields": ['id', 'name', 'description']
		},

		"/tenant/oauth/delete": {
			"commonFields": ['id']
		},
		"/tenant/oauth/list": {
			"commonFields": ['id']
		},
		"/tenant/oauth/add": {
			"commonFields": ['id'],
			"secret": {
				"source": ['body.secret'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"redirectURI": {
				"source": ['body.redirectURI'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "uri"
				}
			}
		},
		"/tenant/oauth/update": {
			"commonFields": ['id'],
			"secret": {
				"source": ['body.secret'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"redirectURI": {
				"source": ['body.redirectURI'],
				"required": true,
				"validation": {
					"type": "string",
					"format": "uri"
				}
			}
		},

		"/tenant/oauth/users/list" :{
			"commonFields": ['id']
		},
		"/tenant/oauth/users/delete" :{
			"commonFields": ['id'],
			"uId":{
				"source": ['query.uId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},
		"/tenant/oauth/users/add" :{
			"commonFields": ['id'],
			"userId":{
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
			}
		},
		"/tenant/oauth/users/update" :{
			"commonFields": ['id'],
			"uId":{
				"source": ['query.uId'],
				"required": true,
				"validation": {
					"type": "string"
				}
			},
			"userId":{
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

		"/tenant/application/delete": {
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/list": {
			"commonFields": ['id']
		},
		"/tenant/application/add": {
			"commonFields": ['id', '_TTL', 'description', 'acl'],
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
			}
		},
		"/tenant/application/update": {
			"commonFields": ['id', 'appId', '_TTL', 'description', 'acl'],
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
			}
		},

		"/tenant/application/key/add": {
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/key/list": {
			"commonFields": ['id', 'appId']
		},
		"/tenant/application/key/delete": {
			"commonFields": ['id', 'appId', 'key']
		},

		"/tenant/application/key/ext/list": {
			"commonFields": ['id', 'appId', 'key']
		},
		"/tenant/application/key/ext/add": {
			"commonFields": ['id', 'appId', 'key'],
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
			}
		},
		"/tenant/application/key/ext/update": {
			"commonFields": ['id', 'appId', 'key'],
			'extKey': {
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
			}
		},
		"/tenant/application/key/ext/delete": {
			"commonFields": ['id', 'appId', 'key'],
			'extKey': {
				"source": ['body.extKey'],
				"required": true,
				"validation": {
					"type": "string"
				}
			}
		},

		"/tenant/application/key/config/list": {
			"commonFields": ['id', 'appId', 'key']
		},
		"/tenant/application/key/config/update": {
			"commonFields": ['id', 'appId', 'key'],
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
			}
		}
	}
};