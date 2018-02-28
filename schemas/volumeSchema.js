"use strict";

var kubernetes = {
	"type": "object",
	"properties": {
		"volumes": {
			"type": "array",
			"required": true,
			"items": {
				"type": "object",
				"properties": {
					"name" : {
						"required": true,
						"type": "string"
					},
					"hostPath": {
						"type": "object",
						"properties": {
							"path" : {
								"type": "string"
							}
						}
					}
				}
			}
		},
		"volumeMounts": {
			"type": "array",
			"required": true,
			"items": {
				"type": "object",
				"properties": {
					"name" : {
						"required": true,
						"type": "string"
					},
					"mountPath": {
						"type": "string"
					}
				}
			}
		}
	}
};

var docker= {
	"type": "object",
	"properties": {
		"volumes": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"Type" : {
						"required": true,
						"type": "string"
					},
					"Source": {
						"type": "string"
					},
					"Target": {
						"type": "string"
					},
					"ReadOnly": {
						"type": "boolean"
					}
				}
			}
		}
	}
};


module.exports = {
	kubernetes : kubernetes,
	docker : docker
};