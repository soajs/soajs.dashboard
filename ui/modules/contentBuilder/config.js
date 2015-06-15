"use strict";
var cbConfig = {
	grid: {
		'active': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Name', 'field': 'name'},
				{'label': 'Version', 'field': 'v'},
				{'label': 'Author', 'field': 'author'},
				{'label': 'Created', 'field': 'ts', 'filter': 'fulldate'},
				{'label': 'Last Modified', 'field': 'modified', 'filter': 'fulldate'}
			],
			'defaultSortField': 'name',
			'defaultLimit': 10
		},
		'revisions': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': 'Version', 'field': 'v'},
				{'label': 'Author', 'field': 'author'},
				{'label': 'Last Modified', 'field': 'modified', 'filter': "fulldate"}
			],
			'defaultSortField': 'v',
			'defaultSortASC': true,
			'defaultLimit': 5
		}
	},

	form: {
		step2: {
			computedUI: [
				{
					'type': 'html',
					'name': 'html-ignore',
					'value': 'This type of inputs is computed by the system and included in the listing UI Grid.'
				},
				{
					'name': 'label',
					'label': 'Input Label',
					'type': 'text',
					'placeholder': 'Title...',
					'value': '',
					'tooltip': 'Enter the input label as it should display in the UI',
					'required': true,
					'fieldMsg': 'Enter a name for this input.'
				},
				{
					'name': 'listing',
					'label': 'Include in Listing',
					'type': 'checkbox',
					'value': [{"v": "yes", "l": "YES"}],
					'required': true,
					'fieldMsg': 'Should this input be included in the Listing Grid?',
					'onAction': function(id, data){
						if(data[0] ==='yes'){
							jQuery(".wizardForm #filter-wrapper").slideDown();
							jQuery(".wizardForm #sorting-wrapper").slideDown();
							jQuery(".wizardForm #sortDirection-wrapper").slideDown();
						}
						else{
							jQuery(".wizardForm #filter-wrapper").slideUp();
							jQuery(".wizardForm #sorting-wrapper").slideUp();
							jQuery(".wizardForm #sortDirection-wrapper").slideUp();
						}
					}
				},
				{
					'name': 'filter',
					'label': 'Optional Display Filter',
					'type': 'select',
					'value': [{"v": "date", "l": "Date"}, {"v": "uppercase", "l": "Uppercase"}],
					'required': false,
					'fieldMsg': 'If it should be included in the Listing Grid, pick an optional filter for it'
				},
				{
					'name': 'sorting',
					'label': 'Default Sorting Field',
					'type': 'checkbox',
					'value': [{"v": "yes", "l": "YES"}],
					'required': false,
					'fieldMsg': 'Should the grid sort the records based on this input?'
				},
				{
					'name': 'sortDirection',
					'label': 'Default Sort Descending ',
					'type': 'select',
					'value': [{"v": "asc", "l": "ASC"}, {"v": "desc", "l": "DESC"}],
					'required': false,
					'fieldMsg': 'Should the grid sort the records based on this input in descending order?'
				}
			],
			user: [
				{
					'type': 'html',
					'name': 'html-ignore',
					'value': 'This Type of inputs is entered by the User while filling the data record fields.'
				},
				{
					'label': 'Basic Input Field Information',
					'name': 'field',
					'type': 'group',
					'entries': [
						{
							'name': 'label',
							'label': 'Input Label',
							'type': 'text',
							'placeholder': 'Title...',
							'value': '',
							'tooltip': 'Enter the input label as it should display in the UI',
							'required': true,
							'fieldMsg': 'Enter a name for this input.'
						},
						{
							"name": "required",
							"label": "Required",
							"type": "radio",
							"value": [{"v": false}, {"v": true}],
							"required": false,
							'fieldMsg': 'Is this input required by the service API?'
						}
					]
				},
				{
					"name": "service",
					"label": "Input IMFV validation",
					"type": "group",
					"collapsed": true,
					"entries": [
						{
							'name': 'imfv',
							'label': 'IMFV configuration',
							'type': 'textarea',
							'rows': 10,
							'placeholder': JSON.stringify({
								"type": "string"
							}, null, 2),
							'value': '',
							'tooltip': 'Enter the JSON Schema of this input',
							'fieldMsg': 'Provide the JSON Schema validation of this input for the service APIs.'
						}
					]
				},
				{
					'name': 'grid',
					'label': 'UI Module Grid',
					'type': 'group',
					'collapsed': true,
					'entries': [
						{
							'name': 'listing',
							'label': 'Include in Listing',
							'type': 'checkbox',
							'value': [{"v": "yes", "l": "YES"}],
							'required': true,
							'fieldMsg': 'Should this input be included in the Listing Grid?',
							'onAction': function(id, data){
								if(data[0] ==='yes'){
									jQuery(".wizardForm #filter-wrapper").slideDown();
									jQuery(".wizardForm #sorting-wrapper").slideDown();
									jQuery(".wizardForm #sortDirection-wrapper").slideDown();
								}
								else{
									jQuery(".wizardForm #filter-wrapper").slideUp();
									jQuery(".wizardForm #sorting-wrapper").slideUp();
									jQuery(".wizardForm #sortDirection-wrapper").slideUp();
								}
							}
						},
						{
							'name': 'filter',
							'label': 'Optional Display Filter',
							'type': 'select',
							'value': [
								{"v": "date", "l": "Date"},
								{"v": "fulldate", "l": "Full Date"},
								{"v": "TTL", "l": "TTL Value"},
								{"v": "uppercase", "l": "Uppercase"},
								{"v": "lowercase", "l": "Lowercase"},
								{"v": "trimmed", "l": "Trimmed 170 Characters"},
								{"v": "trimmed100", "l": "Lowercase 100 Characters"},
								{"v": "object", "l": "Rendered Object"}
							],
							'required': false,
							'fieldMsg': 'If it should be included in the Listing Grid, pick an optional filter for it'
						},
						{
							'name': 'sorting',
							'label': 'Default Sorting Field',
							'type': 'checkbox',
							'value': [{"v": "yes", "l": "YES"}],
							'required': false,
							'fieldMsg': 'Should the grid sort the records based on this input?'
						},
						{
							'name': 'sortDirection',
							'label': 'Default Sort Descending ',
							'type': 'select',
							'value': [{"v": "asc", "l": "ASC"}, {"v": "desc", "l": "DESC"}],
							'required': false,
							'fieldMsg': 'Should the grid sort the records based on this input in descending order?'
						}
					]
				},
				{
					'name': 'form',
					'label': 'UI Module Form',
					'type': 'group',
					'collapsed': true,
					'entries': [
						{
							"name": "type",
							"label": "UI Type",
							"type": "select",
							"value": [
								{"v": "text", "l": "Text Input"},
								{"v": "email", "l": "Email Address"},
								{"v": "url", "l": "URL"},
								{"v": "phone", "l": "Phone Number"},
								{"v": "number", "l": "Number"},
								{"v": "password", "l": "Password"},
								{"v": "textarea", "l": "Text Box"},
								{"v": "editor", "l": "Advanced Editor"},
								//{"v": "audio", "l": "Audio Track"},
								//{"v": "video", "l": "Video Track"},
								//{"v": "image", "l": "Image"},
								//{"v": "document", "l": "Document"},
								{"v": "radio", "l": "list (one value)"},
								{"v": "checkbox", "l": "list (multiple values)"},
								{"v": "select", "l": "list (drop down menu)"},
								{"v": "multi-select", "l": "list (drop down menu multiple selection)"}
							],
							"required": true,
							"fieldMsg": "Pick the type of the input, to be rendered when add/update form opens in UI Module.",
							'onAction': function(id, data){
								var arr1 = ['radio','checkbox','select','multi-select'];
								var arr2 = ['audio','video','image','document'];
								if(arr1.indexOf(data)!== -1){
									jQuery(".wizardForm #limit-wrapper").slideUp();
									jQuery(".wizardForm #defaultValue-wrapper").slideDown();
								}
								else if(arr2.indexOf(data) !== -1){
									jQuery(".wizardForm #defaultValue-wrapper").slideUp();
									jQuery(".wizardForm #limit-wrapper").slideDown();
								}
								else{
									jQuery(".wizardForm #defaultValue-wrapper").slideUp();
									jQuery(".wizardForm #limit-wrapper").slideUp();
								}
							}
						},
						{
							'name': 'defaultValue',
							'label': 'Default Values',
							'type': 'textarea',
							'rows': 2,
							'placeholder': "label1||value1||selected -- label2||value2 -- label3||value3 -- ...",
							'value': '',
							'tooltip': 'Provide the default values',
							'fieldMsg': 'Provide default values in case of: radio - checkbox - select - multi-select'
						},
						{
							"name": "placeholder",
							"label": "Placeholder",
							"type": "text",
							"placeholder": "placeholder...",
							"tooltip": "Enter an optional placeholder value for the input",
							"value": "",
							"required": false,
							"fieldMsg": "The value of this field shows up in text & textarea inputs when provided as a placeholder value."
						},
						{
							"name": "tooltip",
							"label": "Tooltip",
							"type": "text",
							"placeholder": "tooltip...",
							"tooltip": "Enter an optional tooltip value for the input",
							"value": "",
							"required": false,
							"fieldMsg": "The value of this field shows up in a tooltip message when the mouse is over the input."
						},
						{
							"name": "limit",
							"label": "Limit",
							"type": "number",
							"placholder": "0",
							"tooltip": "Enter the max number of files that can be attached to one entry. 0 means unlimited.",
							"value": "",
							"required": false,
							"fieldMsg": "The value of this field applies only to files and defines the maximum limit of files that can be added to one data record."
						}
					]
				}
			]
		},
		step3: {
			settings: [
				{
					"name": "servicePort",
					"label": "Service Port",
					"type": "number",
					"placeholder": "4100",
					"value": "",
					"tooltip": "Enter the service port",
					"required": true,
					'fieldMsg': "Specify the port number of this service"
				},
				{
					"name": "requestTimeout",
					"label": "Request Timeout",
					"type": "number",
					"placeholder": "30",
					"value": "",
					"tooltip": "Enter the request Timeout",
					"required": false,
					'fieldMsg': "Specify how long the service should wait for the API response before timing out"
				},
				{
					"name": "requestTimeoutRenewal",
					"label": "Request Timeout Renewal",
					"type": "number",
					"placeholder": "5",
					"value": "",
					"tooltip": "Enter the request Timeout renewal",
					"required": false,
					'fieldMsg': "In case of timeout, how many attempts should be repeated before giving up"
				},
				{
					"name": "collection",
					"label": "Default Collection",
					"type": "text",
					"placeholder": "data",
					"tooltip": "Enter the default collection where the data should be stored.",
					"value": "",
					"required": true,
					'fieldMsg': "Provide the name of the default collection where the data will be stored by this service"
				},
				{
					"name": "errors",
					"label": "Error Codes & Message",
					"type": "textarea",
					"rows": 6,
					"placeholder": JSON.stringify({400: "Database Error", 401: "Invalid Id provided."}, null, 2),
					"tooltip": "Enter the error codes that should be assigned to your APIs",
					"value": "",
					"required": false,
					'fieldMsg': "What are the error codes this service should return and their messages"
				},
				{
					"name": "extKeyRequired",
					"label": "Requires External Key",
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': "Does this service require an external key in the headers of the requests made to its APIs?"
				},
				{
					"name": "awareness",
					"label": "Requires Awareness",
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': "Does this service need to be aware of the controller(s) presence and location?"
				},
				{
					"name": "session",
					"label": "Supports Session",
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': "Should this service create a persistent session between the requests?"
				},
				{
					"name": "acl",
					"label": "Supports Access Levels",
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': "Would you like to apply access level checking on the external keys from the headers?"
				},
				{
					"name": "security",
					"label": "Supports Key Security",
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': "Should this service apply device and geo security checks on provided keys?"
				},
				{
					"name": "oauth",
					"label": "Secure with oAuth",
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': "Should this service be secured via oAuth?"
				}
			]
		},
		step4: [
			{
				'label': 'Basic API Information',
				'name': 'api',
				'type': 'group',
				'entries': [
					{
						'name': 'route',
						'label': 'API route',
						'type': 'text',
						'placeholder': '/list',
						'value': '',
						'tooltip': 'Enter the route of the API',
						'required': true,
						'fieldMsg': "Enter the route of this API"
					},
					{
						'name': 'method',
						'label': 'API method',
						'type': 'radio',
						'value': [{'v': "get", "l": "GET"}, {'v': "post", "l": "POST"}, {'v': "put", "l": "PUT"}, {'v': "del", "l": "DEL"}],
						'required': true,
						'fieldMsg': "What method does this API use?"
					},
					{
						'name': 'type',
						'label': 'API type',
						'type': 'radio',
						'value': [
							{'v': "list", "l": "list"},
							{'v': "get", "l": "get"},
							{'v': "delete", "l": "delete"},
							{'v': "add", "l": "add"},
							{'v': "update", "l": "update"}
						],
						'required': true,
						'fieldMsg': "What is the type of this API?"
					},
					{
						'name': 'codeValues',
						'label': 'Available Error Codes',
						'type': 'textarea',
						'rows': 6,
						'value': ''
					},
					{
						'name': 'code',
						'label': 'Default Error Code',
						'type': 'number',
						'placeholder': '400',
						'value': '',
						'tooltip': 'Enter the custom error code of this API based on what you filled in the error codes in Step 1',
						'required': true,
						'fieldMsg': "Choose from the above available codes the default error code of this API."
					}
				]
			},
			{
				'label': 'API Display Information',
				'name': 'label',
				'type': 'group',
				'collapsed': true,
				"entries": [
					{
						'name': 'label',
						'label': 'API Label',
						'type': 'text',
						'placeholder': 'List Entries',
						'value': '',
						'tooltip': 'Enter the API Label',
						'required': true,
						'fieldMsg': "What is the Label of this API?"
					},
					{
						'name': 'group',
						'label': 'API Group',
						'type': 'text',
						'placeholder': 'News',
						'value': '',
						'tooltip': 'Enter the Group name of the API',
						'required': true,
						'fieldMsg': "What Group this API belongs to?"
					},
					{
						'name': 'groupMain',
						'label': 'Is API Group Default',
						'type': 'radio',
						'value': [{"v": true}, {"v": false}],
						'required': true,
						'fieldMsg': "Is this the default group API?"
					}
				]
			},
			{
				'label': 'API Inputs',
				'name': 'inputsGroup',
				'type': 'group',
				'collapsed': true,
				'entries': [
					{
						'name': 'inputs',
						'label': 'API Inputs',
						'type': 'checkbox',
						'value': [],
						'required': true,
						'fieldMsg': "Pick the inputs this API will receive. (APIs of type: get - update - delete have the 'id' input auto-included)"
					}
				]
			},
			{
				'label': 'API Workflow',
				'name': 'workflow',
				'type': 'group',
				"collapsed": true,
				'entries': [
					{
						'name': 'initialize',
						'label': 'Initialize',
						'type': 'textarea',
						"rows": 6,
						"tooltip": "Override the default Initialize step",
						'value': "",
						'required': false,
						'fieldMsg': 'Override the default workflow behavior of this step or leave blank to use default.'
					},
					{
						'name': 'preExec',
						'label': 'Pre Execute',
						'type': 'textarea',
						"rows": 6,
						"tooltip": "Enter an optional Pre Execute step or Leave blank to ignore",
						'value': "",
						'required': false,
						'fieldMsg': 'Enter Custom workflow behavior in this step or leave blank to ignore.'
					},
					{
						'name': 'exec',
						'label': 'Execute',
						'type': 'textarea',
						"rows": 6,
						"tooltip": "Override the default Execute step",
						'value': "",
						'required': false,
						'fieldMsg': 'Override the default workflow behavior of this step or leave blank to use default.'
					},
					{
						'name': 'postExec',
						'label': 'Post Execute',
						'type': 'textarea',
						"rows": 6,
						"tooltip": "Enter an optional Post Execute step or Leave blank to ignore",
						'value': "",
						'required': false,
						'fieldMsg': 'Enter Custom workflow behavior in this step or leave blank to ignore.'
					},
					{
						'name': 'response',
						'label': 'Response',
						'type': 'textarea',
						"rows": 6,
						"tooltip": "Override the default Response step",
						'value': "",
						'required': false,
						'fieldMsg': 'Override the default workflow behavior of this step or leave blank to use default.'
					}
				]
			}
		]
	},

	permissions: {
		'listServices': ['dashboard', '/cb/list'],
		'addService': ['dashboard', '/cb/add'],
		'updateService': ['dashboard', '/cb/update'],
		'getService': ['dashboard', '/cb/get'],
		'servicesRevisions': ['dashboard', '/cb/listRevisions']
	}
};