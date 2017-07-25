'use strict';
var ciAppConfig = {
	form: {
		f1: {
			travis: {
				entries: [
					{
						'name': 'domain',
						'label': 'Domain',
						'type': 'text',
						'value': '',
						'placeholder': "",
						'required': true,
						'fieldMsg': "Enter the domain value"
					},
					{
						'name': 'gitToken',
						'label': 'GIT Token',
						'type': 'text',
						'value': '',
						'required': true,
						'fieldMsg': "Enter the GIT Token Value"
					}
				]
			},
			drone: {
				entries: [
					{
						'name': 'domain',
						'label': 'Domain',
						'type': 'text',
						'value': '',
						'placeholder': "",
						'required': true,
						'fieldMsg': "Enter the domain URL value. EX: http://mydoronedomain.com:8000"
					},
					{
						'name': 'gitToken',
						'label': 'Drone Token',
						'type': 'text',
						'value': '',
						'required': true,
						'fieldMsg': "Enter Your Drone Token (provided in your Drone account)"
					},
					{
						'name': 'version',
						'label': 'Backward Compatibility',
						'type': 'checkbox',
						'value': [{'v': true, 'l': 'Version 7 or Below'}],
						'required': true,
						'fieldMsg': "Check the box if Drone Version 7 or below"
					}
				]
			}
		},
		f2: {
			entries: [
				{
					'name': 'template',
					'label': 'Existing Recipe Template',
					'type': 'select',
					'value': [],
					'required': true
				},
				{
					'name': 'name',
					'label': 'Recipe Name',
					'type': 'text',
					'value': '',
					'placeholder': "My Custom Recipe",
					'required': true,
					'fieldMsg': "Enter the name of the recipe"
				},
				{
					'name': 'recipe',
					'label': 'Recipe Content',
					'type': 'textarea',
					'value': '',
					'required': true,
					'rows': 20,
					'cols': 100,
					'fieldMsg': "Provide the Continuous Integration Recipe as YAML code. Once you submit, the dashboard will ensure that the continuous delivery integration script is included in your recipe and that it should run only if the build passes in case you did not provide it."
				}
			]
		}
	},
	permissions: {
		get: ['dashboard', '/ci', 'get'],
		deactivate: ['dashboard', '/ci/provider', 'put'],
		activate: ['dashboard', '/ci/provider', 'post'],
		
		providers: ['dashboard', '/ci/providers', 'get'],
		add: ['dashboard', '/ci/recipe', 'post'],
		edit: ['dashboard', '/ci/recipe', 'put'],
		delete: ['dashboard', '/ci/recipe', 'delete'],
	}

};
