'use strict';
var ciAppConfig = {
	form: {
		f1:{
			entries: [
				{
					'name': 'driver',
					'label': 'Choose Driver',
					'type': 'select',
					'value': [{'v': 'travis', 'l': "Travis", 'selected': true}, {'v': 'drone', 'l': "Drone"}],
					'required': true,
					'fieldMsg': "Select which driver you would like to integrated with."
				},
				{
					'name': 'settings',
					'label': 'Settings',
					'type': 'group',
					'entries': [
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
							'name': 'owner',
							'label': 'Owner',
							'type': 'text',
							'value': '',
							'required': true,
							'fieldMsg': "Enter the Owner of the account"
						},
						{
							'name': 'gitToken',
							'label': 'GIT Token',
							'type': 'text',
							'value': '',
							'required': true,
							'fieldMsg': "Enter the GIT Token Value"
						},
					]
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
					'fieldMsg': "Provide the Continuous Integration Recipe as YAML code"
				}
			]
		}
	},
	permissions: {
		get: ['dashboard', '/ci', 'get'],
		save: ['dashboard', '/ci', 'post'],
		delete: ['dashboard', '/ci', 'delete'],
		download: ['dashboard', '/ci/download', 'get'],
	}
	
};
