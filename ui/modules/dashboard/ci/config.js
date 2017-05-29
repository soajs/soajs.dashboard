'use strict';
var ciAppConfig = {
	form: {
		f1: {
			entries: [
				{
					'name': 'driver',
					'label': 'Choose Driver',
					'type': 'select',
					'value': [{'v': 'travis', 'l': "Travis", 'selected': true}],
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
							'value': 'api.travis-ci.org',
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
					'fieldMsg': "Provide the Continuous Integration Recipe as YAML code. Once you submit, the dashboard will ensure that the continuous delivery integration script is included in your recipe and that it should run only if the build passes in case you did not provide it."
				}
			]
		},
		settings: {
			entries: [
				{
					'name': 'general',
					'label': "General Settings",
					"type": "group",
					"entries": [
						{
							'name': 'builds_only_with_travis_yml',
							'label': 'Build only if .travis.yml is present',
							'type': 'radio',
							'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
							'required': true
						},
						{
							'name': 'build_pushes',
							'label': 'Build branch updates',
							'type': 'radio',
							'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
							'required': true
						},
						{
							'name': 'build_pull_requests',
							'label': 'Build pull request updates',
							'type': 'radio',
							'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No'}],
							'required': true
						},
						{
							'name': 'maximum_number_of_builds',
							'label': 'Limit concurent jobs to a maximum of',
							'type': 'number',
							'value': 0,
							'required': false
						},
					]
				},
				{
					'name': 'envs',
					'label': 'SOAJS Environment Variables',
					'type': 'group',
					'entries': [],
					'collapsed': true
				},
				{
					'name': 'envs',
					'label': 'Other Environment Variables',
					'type': 'group',
					'entries': []
				}
			]
		},
		envVar: [
			{
				'name': 'envName%count%',
				'label': 'Name',
				'type': 'text',
				'placeholder': 'MY_ENV',
				'required': true
			},
			{
				'name': 'envVal%count%',
				'label': 'Value',
				'type': 'text',
				'placeholder': 'FOO',
				'required': true
			},
			{
				"name": "removeEnv%count%",
				"type": "html",
				"value": "<span class='red'><span class='icon icon-cross' title='Remove'></span></span>",
				"onAction": function (id, data, form) {
					var number = id.replace("removeEnv", "");
					// need to decrease count
					delete form.formData['envName' + number];
					delete form.formData['envVal' + number];
					
					form.entries.forEach(function (oneEntry) {
						if (oneEntry.type === 'group' && oneEntry.name === 'envs') {
							for (var i = oneEntry.entries.length - 1; i >= 0; i--) {
								if (oneEntry.entries[i].name === 'envName' + number) {
									oneEntry.entries.splice(i, 1);
								}
								else if (oneEntry.entries[i].name === 'envVal' + number) {
									oneEntry.entries.splice(i, 1);
								}
								else if (oneEntry.entries[i].name === 'removeEnv' + number) {
									oneEntry.entries.splice(i, 1);
								}
							}
						}
					});
				}
			}
		],
		sync: {
			entries: [
				{
					'name': 'info',
					'label': 'SOAJS Environment Variables',
					'type': 'html',
					'fieldMsg': "The following environment variables are needed by SOAJS to set up your CI/CD integration. These variables will be added when you click on Sync Repos in all your active repositories."
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
