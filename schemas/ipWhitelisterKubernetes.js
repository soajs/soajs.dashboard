module.exports = {
    "name" : "Machine Public IP White Lister - Kubernetes",
    "type" : "system",
    "subtype" : "other",
    "description" : "Daemonset catalog recipe that Whitelists machine's public ip address allowing communication with core database server.",
    "locked" : true,
    "recipe" : {
        "deployOptions" : {
            "image" : {
                "prefix" : "library",
                "name" : "alpine",
                "tag" : "latest",
                "pullPolicy" : "IfNotPresent",
                "override" : false
            },
            "readinessProbe" : {
                "httpGet": {
                    "path" : "/",
                    "port" : "http"
                },
                "initialDelaySeconds": 5,
                "timeoutSeconds": 2,
                "periodSeconds": 5,
                "successThreshold": 1,
                "failureThreshold": 3
            },
            "ports" : [

            ],
            "voluming" : {
                "volumes" : [

                ],
                "volumeMounts" : [

                ]
            },
            "restartPolicy" : {
                "condition" : "",
                "maxAttempts" : 0
            },
            "container" : {
                "network" : "",
                "workingDir" : ""
            }
        },
        "buildOptions" : {
            "env" : {
                "HT_PROJECT_NAME" : {
                    "type" : "userInput",
                    "label" : "Project Name",
                    "default": "",
                    "fieldMsg" : "Name of the project that the machine belongs to."
                },
                "HT_DRIVER_NAME" : {
                    "type" : "userInput",
                    "label": "Driver Name",
                    "default" : "",
                    "fieldMsg" : "Name of the Infrastructure provider selected."
                },
                "HT_API_DOMAIN" : {
                    "type" : "userInput",
                    "label" : "SAAS API",
                    "default" : "https://cloud-api.herrontech.com/bridge",
                    "fieldMsg" : "HerronTech SAAS API domain"
                },
                "HT_PROJECT_KEY": {
                    "type" : "userInput",
                    "label" : "SAAS API KEY",
                    "default" : "",
                    "fieldMsg" : "HerronTech SAAS API KEY"
                }
            },
            "settings" : {
            },
            "cmd" : {
                "deploy" : {
                    "command" : [
                        "sh"
                    ],
                    "args" : [
                        "-c",
                        "apk add --update curl bind-tools",
                        "PUBLIC_IP=$(dig TXT +short o-o.myaddr.l.google.com @ns1.google.com | awk -F'\"' '{ print $2}')",
                        "echo \"Public IP is $PUBLIC_IP\"",
                        "curl -X POST $HT_API_DOMAIN/addIPwhitelist -H \"key:$HT_PROJECT_KEY\" -H \"Content-Type:application/json\" -d '{\"driver\":\"'\"$HT_DRIVER_NAME\"'\",\"soajs_project\":\"'\"$HT_PROJECT_NAME\"'\",\"options\":{\"IPentries\":[{\"comment\":\"'\"$HT_PROJECT_NAME\"' Machine\",\"ipAddress\":\"'\"$PUBLIC_IP\"'\"}]}}'"
                    ]
                }
            }
        }
    }
};
