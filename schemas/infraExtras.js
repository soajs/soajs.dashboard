"use strict";
var add =  {
	"required": true,
	"source": ["body.params"],
	"validation": {
		"oneOf": [
			//group
			{
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"section": {"type": "string", required: true, "enum": ["group"]},
					"region": {
						'required': true,
						'type': 'string'
					},
					"labels": {
						'required': false,
						'type': 'object'
					},
					"name": {"type": "pattern", required: true, "pattern": /^[-\w\._\(\)]+$/},
				}
			},
			//network
			{
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"section": {"type": "string", required: true, "enum": ["network"]},
					"name": {
						'required': true,
						'type': 'string'
					},
					"group": {
						'required': true,
						'type': 'string'
					},
					"region": {
						'required': true,
						'type': 'string'
					},
					"addressPrefixes": {
						'required': false,
						'type': 'array',
						"items": {"type": "string", "required": true}
					},
					"dnsServers": {
						'required': false,
						'type': 'array',
						"items": {"type": "string", "required": true}
					},
					"subnets": {
						'required': false,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": {
								"name": {
									'required': true,
									'type': 'string'
								},
								"addressPrefix": {
									'required': false,
									'type': 'string'
								}
							}
						}
					},
					"labels": {
						'required': false,
						'type': 'object'
					}
				}
			},
			//loadBalancer
			{
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"section": {"type": "string", required: true, "enum": ["securityGroup$"]},
					"name": {
						'required': true,
						'type': 'string'
					},
					"group": {
						'required': true,
						'type': 'string'
					},
					"region": {
						'required': true,
						'type': 'string'
					},
					"labels": {
						'required': false,
						'type': 'object'
					}
				}
			},
			//publicIp
			{
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"section": {"type": "string", required: true, "enum": ["publicIp"]},
					"name": {
						'required': true,
						'type': 'string'
					},
					"group": {
						'required': true,
						'type': 'string'
					},
					"region": {
						'required': true,
						'type': 'string'
					},
					"labels": {
						'required': false,
						'type': 'object'
					},
					"publicIPAllocationMethod": {
						'required': false,
						'type': 'string',
						"enum": ["Dynamic", "Static"]
					},
					"idleTimeoutInMinutes": {
						'required': false,
						'type': 'number'
					},
					"publicIPAddressVersion": {
						'required': false,
						'type': 'string',
						"enum": ["IPv4", "IPv6"]
					},
					"type": {
						'required': false,
						'type': 'string',
						"enum": ["Basic", "Standard"]
					}
				}
			},
			//securityGroup
			{
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"section": {"type": "string", required: true, "enum": ["securityGroup$"]},
					"name": {
						'required': true,
						'type': 'string'
					},
					"group": {
						'required': true,
						'type': 'string'
					},
					"region": {
						'required': true,
						'type': 'string'
					},
					"labels": {
						'required': false,
						'type': 'object'
					},
					"ports": {
						'required': true,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": {
								"name": {
									'required': true,
									'type': 'string'
								},
								"priority": {
									'required': true,
									'type': 'number',
									'min': 100,
									'max': 4096
								},
								"protocol": {
									'required': false,
									'type': 'string',
									'enum': ['Tcp', 'Udp', '*']
								},
								"access": {
									'required': false,
									'type': 'string',
									'enum': ['Allow', 'Deny']
								},
								"direction": {
									'required': false,
									'type': 'string',
									'enum': ['Inbound', 'Outbound']
								},
								"sourceAddressPrefix": {
									'required': false,
									'type': 'string'
								},
								"sourcePortRange": {
									'required': false,
									'type': 'string'
								},
								"destinationAddressPrefix": {
									'required': false,
									'type': 'string'
								},
								"destinationPortRange": {
									'required': false,
									"type": "string"
								}
							}
						}
					},
				}
			},
		]
	}
};

module.exports = {
	add: add,
	update: add
};