module.exports = {
    "source": ['body.catalog'],
    "required": true,
    "validation": {
        "type": "object",
        "required": true,
        "properties": {
            "name": { "type": "string", "required": true },
            "type": { "type": "string", "required": true, "enum": [ "service", "daemon", "nginx", "mongo", "es" ] },
            "description": { "type": "string", "required": true },
            "recipe": {
                "type": "object",
                "required": true,
                "properties": {
                    "deployOptions": {
                        "type": "object",
                        "required": true,
                        "properties": {
                            "image": {
                                "type": "object",
                                "required": true,
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
                            }
                        }
                    },
                    "buildOptions": {
                        "type": "object",
                        "required": false,
                        "properties": {
                            "env": {
                                "type": "object",
                                "required": false
                            },
                            "cmd": {
                                "type": "object",
                                "required": false,
                                "properties": {
                                    "pre_install": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "install": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "post_install": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "pre_deploy": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "deploy": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
                                    },
                                    "post_deploy": {
                                        "type": "array",
                                        "required": false,
                                        "items": { "type": "string", "required": true }
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
