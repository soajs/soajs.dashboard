module.exports = {
    "source": ['body.customRegEntry'],
    "required": true,
    "validation": {
        "type": "object",
        "required": true,
        "additionalProperties": false,
        "properties": {
            "name": { "type": "string", "required": true },
            "plugged": { "type": "boolean", "required": true },
            "shared": { "type": "boolean", "required": true },
            "sharedEnv": {
                "type": "object",
                "required": false,
                "patternProperties": {
                    "^[A-Z]+$": { "type": "boolean" }
                }
            },
            "value": { "required": true }
        }
    }
};
