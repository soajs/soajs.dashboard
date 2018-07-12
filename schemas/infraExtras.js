"use strict";

var addressPools = {
	"name": {
		'required': true,
		'type': 'string'
	}
};

var ipConfigs = {
	"name": {
		'required': true,
		'type': 'string'
	},
	"privateIpAllocationMethod": {
		'required': false,
		'type': 'string',
		'enum': ["Static", "Dynamic"]
	},
	"privateIpAddress": {
		'required': false,
		'type': 'string'
	},
	"isPublic": {
		'required': true,
		'type': 'boolean'
	},
	"publicIpAddressId": {
		'required': false,
		'type': 'string'
	},
	"subnetId": {
		'required': false,
		'type': 'string'
	}
};
var ports = {
	"name": {
		'required': true,
		'type': 'string'
	},
	"protocol": {
		'required': false,
		'type': 'string',
		'enum': ["Tcp", "Udp", "All"]
	},
	"target": {
		'required': true,
		'type': 'number'
	},
	"published": {
		'required': false,
		'type': 'number'
	},
	"idleTimeoutInMinutes": {
		'required': false,
		'type': 'number',
		'min': 4,
		'max': 30
	},
	"loadDistribution": {
		'required': false,
		'type': 'string',
		'enum': ["Default", "SourceIP", "SourceIPProtocol"]
	},
	"enableFloatingIP": {
		'required': false,
		'type': 'boolean'
	},
	"disableOutboundSnat": {
		'required': false,
		'type': 'boolean'
	},
	"addressPoolName": {
		'required': true,
		'type': 'string'
	},
	"lbIpConfigName": {
		'required': true,
		'type': 'string'
	},
	"healthProbePort": {
		'required': false,
		'type': 'number'
	},
	"healthProbeProtocol": {
		'required': true,
		'type': 'string',
		'enum': ["Http", "Https", "Tcp"]
	},
	"healthProbeRequestPath": {
		'required': true,
		'type': 'string'
	},
	"maxFailureAttempts": {
		'required': false,
		'type': 'number'
	},
	"healthProbeInterval": {
		'required': false,
		'type': 'number'
	},
	
};

var natPools = {
	"name": {
		'required': true,
		'type': 'string'
	},
	"backendPort": {
		'required': true,
		'type': 'number'
	},
	"protocol": {
		'required': false,
		'type': 'string',
		'enum': ["Tcp", "Udp", "All"]
	},
	"enableFloatingIP": {
		'required': false,
		'type': 'boolean'
	},
	"frontendPortRangeStart": {
		'required': true,
		'type': 'number'
	},
	"frontendPortRangeEnd": {
		'required': true,
		'type': 'number'
	},
	"idleTimeoutInMinutes": {
		'required': false,
		'type': 'number',
		'min': 4,
		'max': 30
	},
	"frontendIPConfigName": {
		'required': true,
		'type': 'string'
	},
};

var natRules = {
	"name": {
		'required': true,
		'type': 'string'
	},
	"backendPort": {
		'required': true,
		'type': 'number'
	},
	"protocol": {
		'required': false,
		'type': 'string',
		'enum': ["Tcp", "Udp", "All"]
	},
	"enableFloatingIP": {
		'required': false,
		'type': 'boolean'
	},
	"frontendPort": {
		'required': true,
		'type': 'number'
	},
	"idleTimeoutInMinutes": {
		'required': false,
		'type': 'number',
		'min': 4,
		'max': 30
	},
	"frontendIPConfigName": {
		'required': true,
		'type': 'string'
	}
};
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
					"section": {"type": "string", required: true, "enum": ["loadBalancer"]},
					"name": { //lbname
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
					"addressPools": {
						'required': true,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": addressPools
						}
					},
					"ipConfigs": {
						'required': true,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": ipConfigs
						}
					},
					"ports": {
						'required': false,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": ports
						}
						
					},
					"natPools": {
						'required': false,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": natPools
						}
						
					},
					"natRules": {
						'required': false,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": natRules
						}
						
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
					"section": {"type": "string", required: true, "enum": ["securityGroup"]},
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