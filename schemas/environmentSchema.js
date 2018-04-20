"use strict";

var environment = {
	"code": {
		"required": true,
		"type": "string",
		"format": "alphanumeric"
	},
	"description": {
		"required": true,
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
	"profile": {
		"required": true,
		"type": "string"
	},
	"dbs": {
		"required": true,
		"type": "object"
	},
	"deployer": {
		"required": true,
		"type": "object"
	},
	"services": {
		"required": true,
		"type": "object"
	}
};

module.exports = environment;
