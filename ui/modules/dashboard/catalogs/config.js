'use strict';

var catalogAppConfig = {
    form: {
        viewRecipe: {
            entries: [
                {
					'name': 'recipe',
					'label': 'Recipe',
					'type': 'jsoneditor',
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
                        "initialDelaySeconds": "",
                        "timeoutSeconds": "",
                        "periodSeconds": "",
                        "successThreshold": "",
                        "failureThreshold": ""
                    },
                    "volumes": []
                },
                "buildOptions": {
                    "env": {
                        "NODE_ENV": "production",
                    },
                    "cmd": {
                        "pre_install": [],
                        "install": [],
                        "post_install": [],
                        "pre_deploy": [],
                        "deploy": [],
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
