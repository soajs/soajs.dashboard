var servicesConfig = {
	form: {
		"oneApi": [
			{
				'name': 'apiV%count%',
				'label': translation.aPIRoute[LANG],
				'type': 'text',
				'value': '',
				'placeholder': '/' + translation.routeName[LANG]
			},
			{
				'name': 'apiL%count%',
				'label': translation.aPILabel[LANG],
				'type': 'text',
				'value': '',
				'placeholder': translation.myAPIRoute[LANG]
			},
			{
				'name': 'apiG%count%',
				'label': translation.aPIGroup[LANG],
				'type': 'text',
				'value': '',
				'placeholder': translation.myAPIGroup[LANG]
			},
			{
				'name': 'apiMain%count%',
				'label': translation.defaultGroupAPI[LANG],
				'type': 'readonly',
				'value': ''
			}
		],
		"serviceCustomAdd": {
			'entries': [
				//{
				//	'name': 'upload',
				//	'label': translation.serviceFile[LANG],
				//	'type': 'document',
				//	'tooltip': translation.uploadServiceFile[LANG],
				//	'required': false,
				//	"limit": 1,
				//	'fieldMsg': translation.formServiceCustomAddFieldMsg[LANG] + "."
				//}
				{
					'name': 'githubAccount',
					'label': 'GitHub Account',
					'type': 'select',
					'value': '',
					'tooltip': 'Select a GitHub account',
					'required': true
				},
				{
					'name': 'githubRepo',
					'label': 'GitHub Repository',
					'type': 'select',
					'value': '',
					'tooltip': 'Select a GitHub repository',
					'required': true
				},
				{
					'name': 'githubBranch',
					'label': 'GitHub Branch',
					'type': 'select',
					'value': '',
					'tooltip': 'Select a GitHub branch',
					'required': true
				}
			]
		},
		"serviceEdit": {
			'entries': [
				{
					'name': 'name',
					'label': translation.serviceName[LANG],
					'type': 'readonly',
					'value': '',
					'tooltip': translation.serviceName[LANG],
					'required': true
				},
				{
					'name': 'port',
					'label': translation.servicePort[LANG],
					'type': 'number',
					'value': '',
					'tooltip': translation.enterServicePortNumber[LANG],
					'required': true
				},
				{
					'name': 'requestTimeout',
					'label': translation.requestTimeout[LANG],
					'type': 'number',
					'placeholder': '30',
					'value': '',
					'tooltip': translation.formRequestTimeoutTooltip[LANG],
					'required': true
				},
				{
					'name': 'requestTimeoutRenewal',
					'label': translation.requestTimeoutRenewal[LANG],
					'type': 'number',
					'placeholder': '5',
					'value': '',
					'tooltip': translation.formRequestTimeoutRenewalTooltip[LANG],
					'required': true
				},
				{
					'name': 'extKeyRequired',
					'label': translation.extKeyRequired[LANG],
					'type': 'readonly',
					'value': '',
					'tooltip': translation.formExtKeyRequiredTooltip[LANG],
					'required': true
				},
				{
					'name': 'awareness',
					'label': translation.awareness[LANG],
					'type': 'readonly',
					'value': '',
					'tooltip': translation.formAwarenessTooltip[LANG],
					'required': true
				},
				{
					"name": "source",
					"label": "Deployment Source",
					"type": "group",
					'collapsed': false,
					"class": "serviceSource",
					"entries": [
						{
							'name': 'type',
							'label': "Type",
							'type': 'text',
							'value': 'github',
							'placeholder': 'Example: github',
							'required': true
						},
						{
							'name': 'owner',
							'label': "Owner",
							'type': 'text',
							'value': '',
							'placeholder': 'Example: soajs',
							'required': true
						},
						{
							'name': 'repo',
							'label': "Repository",
							'type': 'text',
							'value': '',
							'placeholder': 'Example: soajs.dashboard',
							'required': true
						},
						{
							'name': 'branch',
							'label': "Branch",
							'type': 'text',
							'value': '',
							'placeholder': 'Example: master',
							'required': true
						},
						{
							'name': 'main',
							'label': "Main File",
							'type': 'text',
							'value': '',
							'placeholder': 'Example: /index.js',
							'required': true
						},
						{
							'name': 'token',
							'label': 'OAuth',
							'type': 'text',
							'value': '',
							'placeholder': 'Example: my_oauth',
							'required': false
						}
					]
				},
				{
					"name": "apis",
					"label": translation.serviceAPIs[LANG],
					"type": "group",
					'collapsed': false,
					"class": "serviceAPIs",
					"entries": []
				}
			]
		},
		"daemon": {
			"entries": [
				{
					"name": "name",
					"label": translation.name[LANG],
					"type": "text",
					"value": "",
					"tooltip": translation.daemonName[LANG],
					"required": true
				},
				{
					"name": "port",
					"label": translation.port[LANG],
					"type": "number",
					"value": "",
					"tooltip": translation.daemonPort[LANG],
					"required": true
				},
				{
					'name': 'jobs',
					'label': translation.jobs[LANG],
					'type': 'group',
					'collapsed': false,
					'class': 'daemonJobs',
					'entries': []
				}
			]
		},
		"oneJob": [
			{
				'name': 'job%count%',
				'label': translation.jobName[LANG],
				'type': 'text',
				'placeholder': translation.daemonJob[LANG],
				'value': '',
				'tooltip': translation.daemonJob[LANG],
				'required': true
			},
			{
				"type": "html",
				"name": "removeJob%count%",
				"value": "<span class='red'><span class='icon icon-cross' title=" + translation.removeJob[LANG] + "></span></span>",
				"onAction": function (id, data, form) {
					var number = id.replace("removeJob", "");

					delete form.formData['job' + number];

					form.entries.forEach(function (oneEntry) {
						if (oneEntry.type === 'group') {
							for (var i = 0; i < oneEntry.entries.length; i++) {
								if (oneEntry.entries[i].name === 'job' + number) {
									oneEntry.entries.splice(i, 1);
								}
								if (oneEntry.entries[i].name === 'removeJob' + number) {
									oneEntry.entries.splice(i, 1);
								}
							}
						}
					});
				}
			}
		],
		"jobServiceConfig": {
			"entries": [
				{
					"name": "env",
					"label": translation.environment[LANG],
					"type": "text",
					"value": "",
					"tooltip": translation.envCode[LANG],
					"required": true
				},
				{
					"name": "config",
					"label": translation.serviceConfiguration[LANG],
					"type": "textarea",
					"value": "",
					"rows": 10,
					"tooltip": translation.serviceConfiguration[LANG],
					"required": true
				}
			]
		}
	},
	permissions: {
		'listServices': ['dashboard', '/services/list'],
		'daemons': {
			'list': ['dashboard', '/daemons/list'],
			'update': ['dashboard', '/daemons/update'],
			'delete': ['dashboard', '/daemons/delete'],
			'add': ['dashboard', '/daemons/add']
		},
		'daemonGroupConfig': {
			'list': ['dashboard', '/daemons/groupConfig/list'],
			'update': ['dashboard', '/daemons/groupConfig/update'],
			'delete': ['dashboard', '/daemons/groupConfig/delete'],
			'add': ['dashboard', '/daemons/groupConfig/add']
		},
		'tenants': {
			'list': ['dashboard', '/tenant/list']
		},
		'environments': {
			'list': ['dashboard', '/environment/list']
		}
	}
};