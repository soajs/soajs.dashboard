'use strict';
var ciAppConfig = {
	form: {
		f1: {
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
		f2: {
			entries: [
				{
					'name': 'recipe',
					'label': 'Continuous Integration Recipe',
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
		activate: ['dashboard', '/ci/provider', 'post']
	}

};
