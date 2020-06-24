module.exports = {
	"source": ['body.catalog'],
	"required": true,
	"validation": {
		"type": "object",
		"required": true,
		"additionalProperties": false,
		"properties": {
			"name": {"type": "string", "required": true},
			"locked": {"type": "boolean", "required": false},
			"active": {"type": "boolean", "required": false},
			"type": {"type": "string", "required": true},
			"subtype": {"type": "string", "required": false},
			"description": {"type": "string", "required": true},
            "restriction": {
                "type": "object",
				"required" : false,
                "properties": {
                    "deployment": {"type": "array", 'required' : false},
                    "driver": {"type": "array", 'required' : false},
                    "infra": {"type": "array", 'required' : false}
				}
            },
			"recipe": {
				"type": "object",
				"required": true,
				"additionalProperties": false,
				"properties": {
					"deployOptions": {
						"type": "object",
						"required": true,
						"properties": {
							"namespace": {
								"type": "string",
								"required": false
							},
							"image": {
								"type": "object",
								"required": false,
								"properties": {
									"prefix": {"type": "string", "required": false},
									"name": {"type": "string", "required": true},
									"tag": {"type": "string", "required": true},
									"repositoryType": {"type": "string", "required": false, "enum": ["private","public"]},
									"pullPolicy": {"type": "string", "required": false},
									"shell": {"type": "string", "required": false},
								}
							},
							
							"readinessProbe": {
								"type": ["object", "null"],
								"required": false
								//NOTE: removed validation for readinessProbe to allow free schema
							},
							"liveinessProbe": {
								"type": ["object", "null"],
								"required": false
								//NOTE: removed validation for readinessProbe to allow free schema
							},
							"ports": {
								"type": "array",
								"required": false,
								"items": {
									"type": "object",
									"additionalProperties": false,
									"properties": {
										"name": {"type": "string", "required": true},
										"isPublished": {"type": "boolean", "required": false},
										"port": {"type": "number", "required": false},
										"target": {"type": "number", "required": true},
										"published": {"type": "number", "required": false},
										"preserveClientIP": {"type": "boolean", "required": false}
									}
								}
							},
							"voluming": {
								"type": "array",
								"required": false,
								"items": {
									"docker": {
										"type": "object",
										"required": true,
										"properties": {
											"volume": {
												"type": "object",
												"required": true
											}
										}
									},
									"kubernetes": {
										"type": "object",
										"required": true,
										"properties": {
											"volume": {
												"type": "object",
												"required": true,
												
											},
											"volumeMount": {
												"type": "object",
												"required": true
											}
										}
									}
								}
							},
							"labels": {
								"type": "object",
								"required": false
							},
							"execCommands": {
								"type": "object",
								"required": false
							},
							"serviceAccount": {
								"type": "object",
								"required": false
							},
							"allowExposeServicePort": {
								"type": "boolean",
								"required": false
							}
						}
					},
					"buildOptions": {
						"type": "object",
						"required": false,
						"additionalProperties": false,
						"properties": {
							"settings": {
								"type": "object",
								"required": false
							},
							"env": {
								"type": "object",
								"required": false,
								"additionalProperties": {
									"type": "object",
									"properties": {
										"type": {
											"type": "string",
											"required": true,
											"enum": ["static", "userInput", "computed", "secret"]
										},
										"label": {"type": "string", "required": false},
										"fieldMsg": {"type": "string", "required": false},
										"default": {"type": "string", "required": false}
									}
								}
							},
							"cmd": {
								"type": "object",
								"required": false,
								"additionalProperties": false,
								"properties": {
									"deploy": {
										"type": "object",
										"required": true,
										"additionalProperties": false,
										"properties": {
											"command": {"type": "array", "required": true},
											"args": {"type": "array", "required": true}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
};