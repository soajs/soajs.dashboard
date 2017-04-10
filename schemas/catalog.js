module.exports = {
    "source": ['body.catalog'],
    "required": true,
    "validation": {
        "type": "object",
        "required": true,
        "properties": {
            "name": { "type": "string", "required": true },
            "type": { "type": "string", "required": true, "enum": [ "service", "daemon", "mongo", "es" ] },
            "description": { "type": "string", "required": true },
            "locked": { "type": "boolean", "required": false },
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
                            "ports": { //NOTE: only applicable for nginx
                                "type": "object",
                                "required": false,
                                "properties": {
                                    "http": {
                                        "type": "object",
                                        "required": true,
                                        "properties": {
                                            "exposed": { "type": "string", "required": false },
                                            "target": { "type": "string", "required": false }
                                        }
                                    },
                                    "https": {
                                        "type": "object",
                                        "required": true,
                                        "properties": {
                                            "exposed": { "type": "string", "required": false },
                                            "target": { "type": "string", "required": false }
                                        }
                                    }
                                }
                            },
                            "volumes": {
                                "type": "array",
                                "required": false,
                                "properties": {
                                    //TODO: finalize schema for volumes
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
                                    "pre_install": { "type": "string", "required": false },
                                    "install": { "type": "string", "required": false },
                                    "post_install": { "type": "string", "required": false },
                                    "pre_deploy": { "type": "string", "required": false },
                                    "deploy": { "type": "string", "required": false },
                                    "post_deploy": { "type": "string", "required": false }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
