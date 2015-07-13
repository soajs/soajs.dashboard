var servicesConfig = {
	form:{
		"oneApi": [
			{
				'name': 'apiV%count%',
				'label': 'API Route',
				'type': 'text',
				'value': '',
				'placeholder': '/routeName',
				'required': true
			},
			{
				'name': 'apiL%count%',
				'label': 'API Label',
				'type': 'text',
				'value': '',
				'placeholder': 'My API Route',
				'required': true
			},
			{
				'name': 'apiG%count%',
				'label': 'API Group',
				'type': 'text',
				'value': '',
				'placeholder': 'My API Group',
				'required': true
			},
			{
				'name': 'apiMain%count%',
				'label': 'Default Group API',
				'type': 'radio',
				'value': [{'v': false, "selected": true}, {'v': true}]
			},
			{
				"type": "html",
				"name": "removeAPI%count%",
				"value": "<span class='red'><span class='icon icon-cross' title='Remove API'></span></span>",
				"onAction" : function(id, data, form) {
					var number = id.replace("removeAPI", "");

					delete form.formData['apiV'+number];
					delete form.formData['apiL'+number];
					delete form.formData['apiG'+number];
					delete form.formData['apiMain'+number];

					form.entries.forEach(function(oneEntry) {
						if(oneEntry.type === 'group') {

							for(var i = 0; i < oneEntry.entries.length; i++) {
								if(oneEntry.entries[i].name === 'apiV' + number) {
									oneEntry.entries.splice(i, 1);
								}
								if(oneEntry.entries[i].name === 'apiL' + number) {
									oneEntry.entries.splice(i, 1);
								}
								if(oneEntry.entries[i].name === 'apiG' + number) {
									oneEntry.entries.splice(i, 1);
								}
								if(oneEntry.entries[i].name === 'apiMain' + number) {
									oneEntry.entries.splice(i, 1);
								}

								if(oneEntry.entries[i].name === 'removeAPI' + number) {
									oneEntry.entries.splice(i, 1);
								}
							}
						}
					});
				}
			}
		],
		serviceAdd: {
			'entries': [
				{
					'name': 'name',
					'label': 'Service Name',
					'type': 'text',
					'value': '',
					'tooltip': 'Enter the Service name you want to create',
					'required': true
				},
				{
					'name': 'port',
					'label': 'Service Port',
					'type': 'number',
					'value': '',
					'tooltip': 'Enter the Service port number',
					'required': true
				},
				{
					'name': 'requestTimeout',
					'label': 'Request Timeout',
					'type': 'number',
					'placeholder': '30',
					'value': 30,
					'tooltip': 'Maximum timeout value for a request to this service',
					'required': true
				},
				{
					'name': 'requestTimeoutRenewal',
					'label': 'Request Timeout Renewal',
					'type': 'number',
					'placeholder': '5',
					'value': 5,
					'tooltip': 'In case of a timeout, set the number of trial attempts',
					'required': true
				},
				{
					'name': 'extKeyRequired',
					'label': 'External Key Required',
					'type': 'radio',
					'value': [{'v': false, "selected": true}, {'v': true}],
					'tooltip': 'If this service requires an external key; ie if it is multi-tenant',
					'required': true
				},
				{
					'name': 'awareness',
					'label': 'Awareness',
					'type': 'radio',
					'value': [{'v': false, "selected": true}, {'v': true}],
					'tooltip': 'If this service needs to be aware of the location of SOAJS controllers',
					'required': true
				},
				{
					'name': "image",
					"label": "Service Image",
					"type": "text",
					"value": "",
					"required": true,
					"tooltip": "Provide the container image name for this service."
				},
				{
					"name": "apis",
					"label": "Service APIs",
					"type": "group",
					'collapsed': false,
					"class": "serviceAPIs",
					"entries": [
						{
							'name': 'apiV0',
							'label': 'API Route',
							'type': 'text',
							'value': '',
							'placeholder': '/routeName',
							'required': true
						},
						{
							'name': 'apiL0',
							'label': 'API Label',
							'type': 'text',
							'value': '',
							'placeholder': 'My API Route',
							'required': true
						},
						{
							'name': 'apiG0',
							'label': 'API Group',
							'type': 'text',
							'value': '',
							'placeholder': 'My API Group',
							'required': true
						},
						{
							'name': 'apiMain0',
							'label': 'Default Group API',
							'type': 'radio',
							'value': [{'v': false, "selected": true}, {'v': true}]
						},
						{
							"type": "html",
							"name": "removeAPI0",
							"value": "<span class='red'><span class='icon icon-cross' title='Remove API'></span></span>",
							"onAction" : function(id, data, form) {
								var number = id.replace("removeAPI", "");

								delete form.formData['apiV'+number];
								delete form.formData['apiL'+number];
								delete form.formData['apiG'+number];
								delete form.formData['apiMain'+number];

								form.entries.forEach(function(oneEntry) {
									if(oneEntry.type === 'group') {

										for(var i = 0; i < oneEntry.entries.length; i++) {
											if(oneEntry.entries[i].name === 'apiV' + number) {
												oneEntry.entries.splice(i, 1);
											}
											if(oneEntry.entries[i].name === 'apiL' + number) {
												oneEntry.entries.splice(i, 1);
											}
											if(oneEntry.entries[i].name === 'apiG' + number) {
												oneEntry.entries.splice(i, 1);
											}
											if(oneEntry.entries[i].name === 'apiMain' + number) {
												oneEntry.entries.splice(i, 1);
											}

											if(oneEntry.entries[i].name === 'removeAPI' + number) {
												oneEntry.entries.splice(i, 1);
											}
										}
									}
								});
							}
						}
					]
				}
			]
		},
		serviceCustomAdd: {
			'entries': [
				{
					'name': 'upload',
					'label': 'Service File',
					'type': 'document',
					'tooltip': 'Upload Service File',
					'required': false,
					"limit": 1,
					'fieldMsg': "Compress your Service's folder into a ZIP file and upload it using this form."
				}
			]
		},
		serviceEdit:{
			'entries': [
				{
					'name': 'name',
					'label': 'Service Name',
					'type': 'readonly',
					'value': '',
					'tooltip': 'Service Name',
					'required': true
				},
				{
					'name': 'port',
					'label': 'Service Port',
					'type': 'number',
					'value': '',
					'tooltip': 'Enter the Service port number',
					'required': true
				},
				{
					'name': 'requestTimeout',
					'label': 'Request Timeout',
					'type': 'number',
					'placeholder': '30',
					'value': '',
					'tooltip': 'Maximum timeout value for a request to this service',
					'required': true
				},
				{
					'name': 'requestTimeoutRenewal',
					'label': 'Request Timeout Renewal',
					'type': 'number',
					'placeholder': '5',
					'value': '',
					'tooltip': 'In case of a timeout, set the number of trial attempts',
					'required': true
				},
				{
					'name': 'extKeyRequired',
					'label': 'External Key Required',
					'type': 'radio',
					'value': [{'v': false}, {'v': true}],
					'tooltip': 'If this service requires an external key; ie if it is multi-tenant',
					'required': true
				},
				{
					'name': 'awareness',
					'label': 'Awareness',
					'type': 'radio',
					'value': [{'v': false}, {'v': true}],
					'tooltip': 'If this service needs to be aware of the location of SOAJS controllers',
					'required': true
				},
				{
					"name": "apis",
					"label": "Service APIs",
					"type": "group",
					'collapsed': false,
					"class": "serviceAPIs",
					"entries": []
				}
			]
		}
	},
	permissions:{
		'listServices': ['dashboard', '/services/list'],
		'update': ['dashboard', '/services/update']
	}
};