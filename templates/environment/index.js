module.exports = {
	nginxRecipe : function(){
		return {
			"deployOptions": {
				"image": {
					"prefix": "", // updated in code
					"name": "", // updated in code
					"tag": "", // updated in code
					"pullPolicy": "IfNotPresent"
				},
				"readinessProbe": {
					"httpGet": {
						"path": "/",
						"port": "http"
					},
					"initialDelaySeconds": 5,
					"timeoutSeconds": 2,
					"periodSeconds": 5,
					"successThreshold": 1,
					"failureThreshold": 3
				},
				"restartPolicy": {
					"condition": "any",
					"maxAttempts": 5
				},
				"container": {
					"network": "soajsnet",
					"workingDir": "/opt/soajs/deployer/"
				},
				"voluming": {
					"volumes": []
				},
				"ports": [
					{
						"name": "http",
						"target": 80,
						"isPublished": true,
						"published": "", // updated in code
						"preserveClientIP": true
					}
				]
			},
			"buildOptions": {
				"env": {
					"SOAJS_ENV": {
						"type": "computed",
						"value": "$SOAJS_ENV"
					},
					"SOAJS_NX_DOMAIN": {
						"type": "computed",
						"value": "$SOAJS_NX_DOMAIN"
					},
					"SOAJS_NX_API_DOMAIN": {
						"type": "computed",
						"value": "$SOAJS_NX_API_DOMAIN"
					},
					"SOAJS_NX_SITE_DOMAIN": {
						"type": "computed",
						"value": "$SOAJS_NX_SITE_DOMAIN"
					},
					"SOAJS_NX_CONTROLLER_NB": {
						"type": "computed",
						"value": "$SOAJS_NX_CONTROLLER_NB"
					},
					"SOAJS_NX_CONTROLLER_IP": {
						"type": "computed",
						"value": "$SOAJS_NX_CONTROLLER_IP_N"
					},
					"SOAJS_NX_CONTROLLER_PORT": {
						"type": "computed",
						"value": "$SOAJS_NX_CONTROLLER_PORT"
					},
					"SOAJS_DEPLOY_HA": {
						"type": "computed",
						"value": "$SOAJS_DEPLOY_HA"
					},
					"SOAJS_HA_NAME": {
						"type": "computed",
						"value": "$SOAJS_HA_NAME"
					}
				},
				"cmd": {
					"deploy": {
						"command": [
							"bash"
						],
						"args": [
							"-c",
							"node index.js -T nginx"
						]
					}
				}
			}
		};
	}
};