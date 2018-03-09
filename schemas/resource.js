module.exports = {
    "source": ['body.resource'],
    "required": true,
    "validation": {
        "type": "object",
        "required": true,
        "additionalProperties": false,
        "properties": {
            "name": { "type": "string", "required": true , "pattern": /[a-z0-9]{1,61}/},
            "type": { "type": "string", "required": true, "enum": [ 'cluster', 'server', 'cdn', 'system', 'authorization', 'other' ] },
            "category": { "type": "string", "required": true },
            "locked": { "type": "boolean", "required": false },
            "plugged": { "type": "boolean", "required": true },
            "shared": { "type": "boolean", "required": true },
            "sharedEnv": {
                "type": "object",
                "required": false,
                "patternProperties": {
                    "^[A-Z]+$": { "type": "boolean" }
                }
            },
            "config": { "type": "object", "required": true },
	        "sourceCode" : {
		        "type": "object",
		        "required": false,
		        "properties" : {
			        "configuration" : {
				        "type": "object",
				        "required": false,
				        "properties" : {
					        "label" : {"type": "string", "required": true},
					        "repo" : {"type": "string", "required": false},
					        "branch" : {"type": "string", "required": false},
				        }
			        },
			        "custom" : {
				        "type": "object",
				        "required": false,
				        "properties" : {
					        "label" : {"type": "string", "required": true},
					        "repo" : {"type": "string", "required": false},
					        "branch" : {"type": "string", "required": false},
				        }
			        }
		        }
	        }
        }
    }
};
