module.exports = {
    "source": ['body.resource'],
    "required": true,
    "validation": {
        "type": "object",
        "required": true,
        "additionalProperties": false,
        "properties": {
            "name": { "type": "string", "required": true , "pattern": /^[a-z0-9]{0,61}$/},
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
            "config": { "type": "object", "required": true }
        }
    }
};
