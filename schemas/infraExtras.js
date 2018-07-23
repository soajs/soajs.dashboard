"use strict";

var addressPools = {
	"name": {
		'required': true,
		'type': 'string'
	}
};

var ipConfigs = {
	"privateIpAllocationMethod": {
		'required': false,
		'type': 'string',
		'enum': ["static", "dynamic"]
	},
	"privateIpAddress": {
		'required': false,
		'type': 'string'
	},
	"isPublic": {
		'required': true,
		'type': 'boolean'
	},
	"publicIpAddress": {
		'required': false,
		'type': 'object',
		"properties": {
			"id": {
				'required': true,
				'type': 'string'
			}
		}
	},
	"subnet": {
		'required': false,
		'type': 'object',
		"properties": {
			"id": {
				'required': true,
				'type': 'string'
			}
		}
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
		'enum': ["tcp", "udp", "all"]
	},
	"target": {
		'required': true,
		'type': 'number'
	},
	"published": {
		'required': false,
		'type': 'number'
	},
	"idleTimeout": {
		'required': false,
		'type': 'number',
		'min': 240,
		'max': 1800
	},
	"loadDistribution": {
		'required': false,
		'type': 'string',
		'enum': ["default", "sourceIP", "sourceIPProtocol"]
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
	"healthProbePort": {
		'required': false,
		'type': 'number'
	},
	"healthProbeProtocol": {
		'required': true,
		'type': 'string',
		'enum': ["http", "https", "tcp"]
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
	}
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
		'enum': ["tcp", "udp", "all"]
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
	"idleTimeout": {
		'required': false,
		'type': 'number',
		'min': 240,
		'max': 1800
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
		'enum': ["http", "https", "tcp"]
	},
	"enableFloatingIP": {
		'required': false,
		'type': 'boolean'
	},
	"frontendPort": {
		'required': true,
		'type': 'number'
	},
	"idleTimeout": {
		'required': false,
		'type': 'number',
		'min': 240,
		'max': 1800
	},
	"frontendIPConfigName": {
		'required': true,
		'type': 'string'
	}
};

var rules = {
	"name": {
		'required': true,
		'type': 'string'
	},
	"config": {
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
					"address": {
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
								"address": {
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
					"rules": {
						'required': true,
						'type': 'array',
						"items": {
							"type": "object",
							"required": true,
							"properties": rules
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
						"enum": ["dynamic", "static"]
					},
					"idleTimeout": {
						'required': false,
						'type': 'number'
					},
					"ipAddressVersion": {
						'required': false,
						'type': 'string',
						"enum": ["IPv4", "IPv6"]
					},
					"type": {
						'required': false,
						'type': 'string',
						"enum": ["basic", "standard"]
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
									'enum': ['TCP', 'UDP', '*']
								},
								"access": {
									'required': false,
									'type': 'string',
									'enum': ['allow', 'deny']
								},
								"direction": {
									'required': false,
									'type': 'string',
									'enum': ['inbound', 'outbound']
								},
								"sourceAddress": {
									'required': false,
									'type': 'string'
								},
								"target": {
									'required': false,
									'type': 'string'
								},
								"destinationAddress": {
									'required': false,
									'type': 'string'
								},
								"published": {
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
