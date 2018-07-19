"use strict";
var genericService = {
	"type": "object",
	"properties": {
		"config": {
			"type": "object",
			"properties": {
				"serviceName": {"type": "string", "minLength": "3", "pattern": /^[a-z0-9\-]+$/},
				"servicePort": {"type": "integer", "min": 4100},
				"requestTimeout": {"type": "integer", "min": 10},
				"requestTimeoutRenewal": {"type": "integer", "max": 10},
				
				"extKeyRequired": {"type": "boolean"},
				"oauth": {"type": "boolean"},
				"session": {"type": "boolean"},
				
				"urac": {"type": "boolean"},
				"urac_Profile": {"type": "boolean"},
				"urac_ACL": {"type": "boolean"},
				"provision_ACL": {"type": "boolean"},
                
				"maxFileUpload": { "type": "string" },
				"errors": {
					"type": "object",
					"patternProperties": {
						"^[0-9]+$": {"type": "string", "required": true, "minLength": 5}
					}
				},
				"schema": {
					"type": "object",
					"properties": {
						"commonFields": {
							"type": "object",
							"required": true,
							"additionalProperties": {
								"type": "object",
								"properties": {
									"req": {"type": "boolean"},
									"source": {"type": "array", "minItems": 1, "items": {"type": "string"}},
									"type": "object",
									"additionalProperties": true
								},
								"required": ["req", "source", "validation"]
							}
						},
						"patternProperties": {
							"^\/[a-zA-Z0-9_\.\-]+$": {
								"type": "object",
								"properties": {
									"_apiInfo": {
										"type": "object",
										"properties": {
											"l": {"type": "string"},
											"group": {"type": "string"},
											"groupMain": {"type": "boolean"}
										},
										"required": ["l", "group"]
									},
									"commonFields": {"type": "array", "minItems": 1, "items": {"type": "string"}}
								},
								"required": ["_apiInfo"]
							}
						}
					}
				}
			},
			"required": ["serviceName", "servicePort", "requestTimeout", "requestTimeoutRenewal", "extKeyRequired", "errors", "schema"]
		}
	},
	"required": ["config", "options"]
};

var soajsService = {
	"type": "object",
	"properties": {
		"db": {
			"type": "object",
			"properties": {
				"collection": {"type": "string"},
				"multitenant": {"type": "boolean"},
				"config": {"type": "object", "additionalProperties": true}
			},
			"required": ["collection", "multitenant"]
		},
		"apis": {
			"type": "object",
			"patternProperties": {
				"^\/[a-zA-Z0-9_\.\-]+$": {
					"type": "object",
					"properties": {
						"type": {"type": "string", "enum": ['get', 'list', 'add', 'update', 'delete']},
						"mw": {
							"type": "object",
							"properties": {
								"code": {"type": "integer", "required": true},
								"additionalProperties": true
							}
						},
						"method": {"type": "string", "enum": ['get', 'post', 'put', 'del']},
						"workflow": {
							"type": "object",
							"properties": {
								"initialize": {"type": "string"},
								"preExec": {"type": "string"},
								"exec": {"type": "string"},
								"postExec": {"type": "string"},
								"response": {"type": "string"}
							}
						}
					},
					"required": ["type", "mw", "method", "workflow"]
				}
			}
		}
	},
	"required": ["db", "apis"]
};

var formElements = {
	"type": "array",
	"minItems": 1,
	"items": {
		"type": "object",
		"properties": {
			"name": {"type": "string"},
			"label": {"type": "string"},
			"req": {"type": "boolean"},
			"_type": {
				"type": "string",
				"enum": ['text', 'password', 'email', 'number', 'phone', 'url', 'readonly', 'textarea', 'radio', 'checkbox', 'select', 'multi-select', 'date-picker', 'html', 'editor', 'audio','image','video','document']
			},
			"placeholder": {"type": "string"},
			"tooltip": {"type": "string"},
			"value": {
				"oneOf": [
					{
						"type": "string"
					},
					{
						"type": "array",
						"minItems": 1,
						"items": {
							"type": "object",
							"properties": {
								"v": {"type": "string"},
								"l": {"type": "string"},
								"selected": {"type": "boolean"}
							},
							"required": ['v']
						}
					}
				]
			},
			"fieldMsg": {"type": "string"},
			"rows": {"type": "integer"},
			"min": {"type": "date-time"}
		},
		"required": ["name", "label", "req", "_type"]
	}
};

var soajsUI = {
	"type": "object",
	"properties": {
		"list": {
			"type": "object",
			"properties": {
				"columns": {
					"type": "array",
					"minItems": 1,
					"item": {
						"type": "object",
						"properties": {
							"label": {"type": "string"},
							"field": {"type": "string"},
							"filter": {"type": "string"}
						},
						"required": ["label", "field"]
					}
				}
			}
		},
		"form": {
			"type": "object",
			"required": true,
			"properties": {
				"add": formElements,
				"update": formElements
			}
		}
	},
	"required": ["list", "form"]
};

var serviceSchema = {
	"type": "object",
	"properties": {
		"genericService": genericService,
		"soajsService": soajsService,
		"soajsUI": soajsUI
	}
};
module.exports = serviceSchema;