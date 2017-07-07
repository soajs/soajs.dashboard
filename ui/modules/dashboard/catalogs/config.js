'use strict';

var catalogAppConfig = {
    form: {
        viewRecipe: {
            entries: [
                {
					'name': 'recipe',
					'label': 'Recipe',
                    'fieldMsg': "Click <a href='https://soajsorg.atlassian.net/wiki/display/SOAJ/Catalog+Recipes' target='_blank'>here</a> to learn how to build a catalog recipe",
					'type': 'jsoneditor',
                    'readonly': true,
					'height': '450px',
                    'fixedHeight': true,
					'value': {},
					'required': true
				}
            ]
        },
        addRecipe: {
            entries: [
                {
                    'name': 'template',
					'label': 'Existing Recipe Template',
					'type': 'select',
					'value': [],
					'required': true
                },
                {
					'name': 'recipe',
					'label': 'Recipe',
	                'fieldMsg': "Click <a href='https://soajsorg.atlassian.net/wiki/display/SOAJ/Catalog+Recipes' target='_blank'>here</a> to learn how to build a catalog recipe",
	                'type': 'jsoneditor',
					'height': '450px',
                    'fixedHeight': true,
					'value': {},
					'required': true
				}
            ]
        }
    },
    templates: {
        recipe: {
            "name": "",
            "type": "",
            "description": "",
            "recipe": {
                "deployOptions": {
                    "image": {
                        "prefix": "",
                        "name": "",
                        "tag": "",
                        "pullPolicy": ""
                    },
                    "readinessProbe": {
                        "httpGet": {
                            "path": "",
                            "port": ""
                        },
                        "initialDelaySeconds": 0,
                        "timeoutSeconds": 0,
                        "periodSeconds": 0,
                        "successThreshold": 0,
                        "failureThreshold": 0
                    },
                    "ports": [],
                    "voluming": {
                        "volumes": [],
                        "volumeMounts": []
                    },
                    "restartPolicy": {
                        "condition": "",
                        "maxAttempts": 0
                    },
                    "container": {
                        "network": "",
                        "workingDir": ""
                    }
                },
                "buildOptions": {
                    "settings": {
                        "accelerateDeployment": true
                    },
                    "env": {},
                    "cmd": {
                        "pre_deploy": [],
                        "post_deploy": []
                    }
                }
            }
        }
    },
    permissions: {
		list: ['dashboard', '/catalog/recipes/list', 'get'],
		add: ['dashboard', '/catalog/recipes/add', 'post'],
		update: ['dashboard', '/catalog/recipes/update', 'put'],
		delete: ['dashboard', '/catalog/recipes/delete', 'delete']
	}

};
