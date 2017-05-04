module.exports = {
    "source": ['body.catalog'],
    "required": true,
    "validation": {
        "type": "object",
        "required": true,
        "additionalProperties": false,
        "properties": {
            "name": { "type": "string", "required": true },
            "locked": { "type": "boolean", "required": false },
            "type": { "type": "string", "required": true, "enum": [ "service", "daemon", "nginx", "nodejs", "mongo", "es" ] },
            "description": { "type": "string", "required": true },
            "recipe": {
                "type": "object",
                "required": true,
                "additionalProperties": false,
                "properties": {
                    "deployOptions": {
                        "type": "object",
                        "required": true,
                        "properties": {
                            "image": {
                                "type": "object",
                                "required": false,
                                "properties": {
                                    "prefix": { "type": "string", "required": false },
                                    "name": { "type": "string", "required": true },
                                    "tag": { "type": "string", "required": true },
                                    "pullPolicy": { "type": "string", "required": false }
                                }
                            },
                            "readinessProbe": {
                                "type": "object",
                                "required": false,
                                "additionalProperties": false,
                                "properties": {
                                    "httpGet": {
                                        "type": "object",
                                        "required": true,
                                        "properties": {
                                            "path": { "type": "string", "required": true },
                                            "port": { "type": "string", "required": true }
                                        }
                                    },
                                    "initialDelaySeconds": { "type": "number", "required": true },
                                    "timeoutSeconds": { "type": "number", "required": true },
                                    "periodSeconds": { "type": "number", "required": true },
                                    "successThreshold": { "type": "number", "required": true },
                                    "failureThreshold": { "type": "number", "required": true }
                                }
                            },
                            "ports": {
                                "type": "array",
                                "required": false,
                                "items": {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "properties": {
                                        "name": { "type": "string", "required": true },
                                        "isPublished": { "type": "boolean", "required": false },
                                        "target": { "type": "number", "required": true },
                                        "published": { "type": "number", "required": false }
                                    }
                                }
                            },
                            "voluming": {
                                "type": "object",
                                "required": false,
                                "additionalProperties": false,
                                "properties": {
                                    "volumes": {
                                        "type": "array",
                                        "required": true,
                                        "validation": {
                                            "type": "array"
                                        }
                                    },
                                    "volumeMounts": {
                                        "type": "array",
                                        "required": false,
                                        "validation": {
                                            "type": "array"
                                        }
                                    }
                                }
                            },

                        }
                    },
                    "buildOptions": {
                        "type": "object",
                        "required": false,
                        "additionalProperties": false,
                        "properties": {
                            "settings": {
                                "type": "object",
                                "required": false,
                                "properties": {
                                    "accelerateDeployment": { "type": "boolean", "required": false }
                                }
                            },
                            "env": {
                                "type": "object",
                                "required": false,
                                "additionalProperties": false,
                                "properties": {
                                    "type": { "type": "string", "required": true, "enum": [ "static", "userInput", "computed" ]},
                                    "value": {"type": "string", "required": false},
                                    "label": {"type": "string", "required": false},
                                    "fieldMsg": {"type": "string", "required": false},
                                    "default": {"type": "string", "required": true},
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
                                            "command": { "type": "array", "required": true},
                                            "args": { "type": "array", "required": true}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        }
    }
};
