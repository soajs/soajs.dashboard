"use strict";
var oneApiRoute = {
	"^\/[a-zA-Z0-9_\.\-]+$": {
		"type": "object",
		"properties": {
			"method": {
				"type": "string",
				"required": false,
				"enum": ["GET", "POST", "PUT", "DELETE", "DEL"]
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
									"required": {"type": "boolean", "required": true},
									"source": {
										"type": "array",
										"minItems": 1,
										"items": {"type": "string"},
										"required": true
									},
									"validation": {
										"oneOf":[
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
				"required": true,
				"type": "object",
				"properties": {
					"l": {"type": "string", "required": true},
					"group": {"type": "string", "required": true},
					"groupMain": {"type": "boolean"}
				}
			},
			"commonFields": {"type": "array", "minItems": 1, "items": {"type": "string"}},
			"additionalProperties": {
				"type": "object",
				"properties": {
					"required": {"type": "boolean", "required": true},
					"source": {
						"type": "array",
						"minItems": 1,
						"items": {"type": "string"},
						"required": true
					},
					"validation": {
						"oneOf":[
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
};

var apiRoute = {
	"oneOf":[
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
									"required": {"type": "boolean", "required": true},
									"source": {
										"type": "array",
										"minItems": 1,
										"items": {"type": "string"},
										"required": true
									},
									"validation": {
										"oneOf":[
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
						oneApiRoute,
						{
							"type": "object",
							"required": true,
							"patternProperties": oneApiRoute
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
};

var config = {
	"oneOf": [
		{
			"type": "object",
			"required": true,
			"properties": {
				"type": {
					"type": "string",
					"enum": ["service"]
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
				},
				"serviceVersion": {"type": "integer", "min": 1, "required": false},
				"serviceName": {"type": "string", "minLength": "3", "required": true, "pattern": /^[a-z0-9\-]+$/},
				"serviceGroup": {"type": "string", "minLength": "3", "required": false},
				"servicePort": {"type": "integer", "min": 4100, "required": true},
				"prerequisites": {"type": "object", "required": true},
				"requestTimeout": {"type": "integer", "min": 10},
				"requestTimeoutRenewal": {"type": "integer", "max": 10},
				"extKeyRequired": {"type": "boolean"},
				"session": {"type": "boolean"},
                "oauth": {"type": "boolean"},
                "urac": {"type": "boolean"},
                "urac_Profile": {"type": "boolean"},
                "urac_ACL": {"type": "boolean"},
                "provision_ACL": {"type": "boolean"},

				"swagger": {"type": "boolean"},
				"multitenant": {"type": "boolean"},
				"roaming": {"type": "boolean"},
				"awarenessEnv": {"type": "boolean"},
				"errors": {
					"oneOf":[
						{
							"type": "object",
							"required": false,
							"patternProperties": {
								"^[0-9]+$": {"type": "string", "required": true, "minLength": 5}
							}
						},
						{
							"type": "string",
							"required": false
						}
					]
				},
				"schema": apiRoute
			}
		},
		{
			"type": "object",
			"required": true,
			"properties": {
				"type": {
					"type": "string",
					"enum": ["daemon"]
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
				},
				"serviceVersion": {"type": "integer", "min": 1, "required": false},
				"serviceName": {"type": "string", "minLength": "3", "required": true, "pattern": /^[a-z0-9\-]+$/},
				"serviceGroup": {"type": "string", "minLength": "3", "required": false},
				"servicePort": {"type": "integer", "min": 4100, "required": true},
				"prerequisites": {"type": "object", "required": true},
				"swagger": {"type": "boolean"},
				"errors": {
					"oneOf":[
						{
							"type": "object",
							"required": false,
							"patternProperties": {
								"^[0-9]+$": {"type": "string", "required": true, "minLength": 5}
							}
						},
						{
							"type": "string",
							"required": false
						}
					]
				},
				"schema": {
					"oneOf":[
						{
							"type": "object",
							"required": true,
							"properties": {
								"patternProperties": {
									"^\/[a-zA-Z0-9_\.\-]+$": {
										"type": "object",
										"properties": {
											"l": {"type": "string", "required": true},
											"mw": {
												"type": "string",
												"required": false,
												"pattern": "^/[^/]+(/[^/]+)*$"
											}
										}
									}
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
	]
};

var versionNbr = "^(\\*|[0-9]+(\\.(\\*|[0-9]+))+|[0-9]+(\\.[0-9]+)+(\\-[a-z]+(\\.[0-9]+(\\.)*)*))$";
var pckg = {
	"type": "object",
	"required": true,
	"properties": {
		"name": {"type": "string", "required": true},
		"description": {"type": "string", "required": true},
		"version": {
			"type": "string",
			"required": true,
			"pattern": versionNbr
		},
		"author": {
			"type": "object",
			"required": true,
			"properties": {
				"name": {"type": "string", "required": true},
				"email": {"type": "string", "required": true, "format": "email"},
				"additionalProperties": true
			}
		},
		"repository": {
			"type": "object",
			"required": true,
			"properties": {
				"type": {"type": "string", "required": true},
				"url": {"type": "string", "required": true},
				"additionalProperties": true
			}
		},
		"license": {"type": "string", "required": true},
		"engines": {
			"type": "object",
			"required": true,
			"properties": {
				"node": {"type": "string", "required": true},
				"additionalProperties": true
			}
		},
		"scripts": {
			"type": "object",
			"required": false,
			"properties": {
				"test": {"type": "string", "required": true},
				"additionalProperties": true
			}
		},
		"devDependencies": {
			"type": "object",
			"required": false,
			"additionalProperties": {
				"type": "string",
				"required": true,
				"pattern": versionNbr
			}
		},
		"dependencies": {
			"type": "object",
			"required": true,
			"additionalProperties": {
				"type": "string",
				"required": true,
				"pattern": versionNbr
			}
		}

	}
};

var contract = {
	"type": "object",
	"additionalProperties": false,
	"properties": {
		"oneOf": [
			{
				"commonFields": {
					"type": "object",
					"additionalProperties": { "type": "object" }
				}
			},
			{
				"patternProperties": {
					"^\b(get|post|put|del|delete)\b$": {
						"type": "object",
						"patternProperties": {
							"^[_a-z\/][_a-zA-Z0-9\/:]*$": { //pattern to match an api route
								"type": "object",
								"required": true,
								"properties": {
									"_apiInfo": {
										"required": true,
										"type": "object",
										"additionalProperties": false,
										"properties": {
											"l": {"type": "string", "required": true},
											"group": {"type": "string", "required": true},
											"groupMain": {"type": "boolean"}
										}
									},
									"imfv": {
										"type": "object",
										"additionalProperties": false,
										"properties": {
											"commonFields": {
												"type": "array",
												"uniqueItems": true,
												"items": {"type": "string", "required": true}
											},
											"custom": {
												"type": "object",
												"additionalProperties": { "type": "object" }
											}
										}
									}
								},
								"additionalProperties": false
							}
						}
					}
				}
			}
		]
	}
};

module.exports = {
	"config": config,
	"service": config.oneOf[0],
	"daemon": config.oneOf[1],
	"package": pckg,
	"contract": contract
};