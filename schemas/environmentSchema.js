"use strict";

var environment = {
	"code": {
		"required": true,
		"type": "string",
		"format": "alphanumeric"
	},
	"envType": {
		"required": true,
		"type": "string",
		"enum": ['manual', 'container', 'singleInfra']
	},
	"description": {
		"required": false,
		"type": "string"
	},
	"namespace": {
		"required": false,
		"type": "string"
	},
	"domain": {
		"required": false,
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
	"tKeyPass": {
		"required": false,
		"type": "string"
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
	"deployPortal": {
		"required": false,
		"type": "boolean"
	},
	"deploy": {
		"required": false,
		"type": "object",
		"propeties": {

		}
	},
	"templateId": {
		"required": true,
		"type": "string"
	},
	"infraId": {
		"required": false,
		"type": "string"
	}
};

module.exports = environment;
