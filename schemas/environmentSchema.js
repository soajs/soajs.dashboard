"use strict";

var environment = {
	"code": {
		"required": true,
		"type": "string",
		"format": "alphanumeric",
		"maxLength": 4
	},
	"description": {
		"required": true,
		"type": "string"
	},
	"domain": {
		"required": true,
		"type": "string",
		"format": "hostname"
	},
	"apiPrefix": {
		"required": false,
		"type": "string"
	},
	"sitePrefix": {
		"required": false,
		"type": "string"
	},
	"sensitive": {
		"required": false,
		"type": "boolean"
	},
	"soajsFrmwrk": {
		"required": false,
		"type": "boolean"
	},
	"cookiesecret": {
		"required": false,
		"type": "string"
	},
	"sessionName": {
		"required": false,
		"type": "string"
	},
	"sessionSecret": {
		"required": false,
		"type": "string"
	},
	"deploy": {
		"required": false,
		"type": "object",
		"propeties": {
		
		}
	}
};

module.exports = environment;