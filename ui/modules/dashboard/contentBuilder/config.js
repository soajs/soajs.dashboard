"use strict";
var cbConfig = {
	grid: {
		'active': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': translation.name[LANG], 'field': 'name'},
				{'label': translation.version[LANG], 'field': 'v'},
				{'label': translation.author[LANG], 'field': 'author'},
				{'label': translation.created[LANG], 'field': 'ts', 'filter': 'fulldate'},
				{'label': translation.lastModified[LANG], 'field': 'modified', 'filter': 'fulldate'}
			],
			'defaultSortField': 'name',
			'defaultLimit': 10
		},
		'revisions': {
			recordsPerPageArray: [5, 10, 50, 100],
			'columns': [
				{'label': translation.version[LANG], 'field': 'v'},
				{'label': translation.author[LANG], 'field': 'author'},
				{'label': translation.lastModified[LANG], 'field': 'modified', 'filter': "fulldate"}
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
					'value': translation.cbFormStep2ComputedUIHTMLValue[LANG]
				},
				{
					'name': 'label',
					'label': translation.inputLabel[LANG],
					'type': 'text',
					'placeholder': translation.title[LANG],
					'value': '',
					'tooltip': translation.cbFormStep2LabelTooltip,
					'required': true,
					'fieldMsg': translation.cbFormStep2LabelFieldMSG[LANG]
				},
				{
					'name': 'listing',
					'label': translation.includingInListing[LANG],
					'type': 'checkbox',
					'value': [{"v": "yes", "l": "YES"}],
					'required': true,
					'fieldMsg': translation.cbFormStep2ComputedUIListingFieldMSG[LANG],
					'onAction': function (id, data) {
						if (data[0] === 'yes') {
							jQuery(".wizardForm #filter-wrapper").slideDown();
							jQuery(".wizardForm #sorting-wrapper").slideDown();
							jQuery(".wizardForm #sortDirection-wrapper").slideDown();
						}
						else {
							jQuery(".wizardForm #filter-wrapper").slideUp();
							jQuery(".wizardForm #sorting-wrapper").slideUp();
							jQuery(".wizardForm #sortDirection-wrapper").slideUp();
						}
					}
				},
				{
					'name': 'filter',
					'label': translation.optionalDisplayFilter[LANG],
					'type': 'select',
					'value': [{"v": "date", "l": translation.date[LANG]}, {
						"v": "uppercase",
						"l": translation.uppercase[LANG]
					}],
					'required': false,
					'fieldMsg': translation.cbFormStep2ComputedUIFilterFieldMSG[LANG]
				},
				{
					'name': 'sorting',
					'label': translation.defaultSortingField[LANG],
					'type': 'checkbox',
					'value': [{"v": "yes", "l": translation.yes[LANG]}],
					'required': false,
					'fieldMsg': translation.cbFormStep2ComputedUISortingFieldMSG[LANG]
				},
				{
					'name': 'sortDirection',
					'label': translation.defaultSortDescending[LANG],
					'type': 'select',
					'value': [{"v": "asc", "l": "ASC"}, {"v": "desc", "l": "DESC"}],
					'required': false,
					'fieldMsg': translation.cbFormStep2ComputedUISortDirectionFieldMSG[LANG]
				}
			],
			fileUI: [
				{
					'type': 'html',
					'name': 'html-ignore',
					'value': translation.cbFormStep2FileUIHtml[LANG]
				},
				{
					'name': 'label',
					'label': translation.inputLabel[LANG],
					'type': 'text',
					'placeholder': translation.title[LANG],
					'value': '',
					'tooltip': translation.cbFormStep2LabelTooltip[LANG],
					'required': true,
					'fieldMsg': translation.cbFormStep2LabelFieldMSG[LANG]
				},
				{
					"name": "type",
					"label": translation.uiType[LANG],
					"type": "select",
					"value": [
						{"v": "audio", "l": translation.audioTrack[LANG]},
						{"v": "video", "l": translation.videoTrack[LANG]},
						{"v": "image", "l": translation.image[LANG]},
						{"v": "document", "l": translation.document[LANG]}
					],
					"required": true,
					"fieldMsg": translation.cbFormStep2FileUITypeFieldMsg[LANG]
				},
				{
					"name": "limit",
					"label": translation.limit[LANG],
					"type": "number",
					"placeholder": "0",
					"tooltip": translation.cbFormStep2FileUILimitTooltip[LANG],
					"value": 1,
					"required": false,
					"fieldMsg": translation.cbFormStep2FileUILimitFieldMsg[LANG]
				}
			],
			user: [
				{
					'type': 'html',
					'name': 'html-ignore',
					'value': translation.cbFormStep2UserHtml[LANG]
				},
				{
					'label': translation.inputGeneralInformation[LANG],
					'name': 'field',
					'type': 'group',
					'entries': [
						{
							'name': 'label',
							'label': translation.inputLabel[LANG],
							'type': 'text',
							'placeholder': translation.title[LANG],
							'value': '',
							'tooltip': translation.cbFormStep2LabelTooltip[LANG],
							'required': true,
							'fieldMsg': translation.cbFormStep2LabelFieldMSG[LANG]
						},
						{
							"name": "required",
							"label": translation.required[LANG],
							"type": "radio",
							"value": [{"v": false}, {"v": true}],
							"required": false,
							'fieldMsg': translation.cbFormStep2FieldRequiredFieldMsg[LANG]
						}
					]
				},
				{
					"name": "service",
					"label": translation.InputIMFVProperties[LANG],
					"type": "group",
					"collapsed": true,
					"entries": [
						{
						    'name': 'imfv',
						    'label': translation.imfvConfiguration[LANG],
						    'type': 'textarea',
						    'height': '80px',
						    "value": '{ }',
							'tooltip': translation.cbFormStep2FieldImfvTooltip[LANG],
							'fieldMsg': translation.cbFormStep2FieldImfvFieldMsg[LANG]
						}
					]
				},
				{
					'name': 'grid',
					'label': translation.inputListingProperties[LANG],
					'type': 'group',
					'collapsed': true,
					'entries': [
						{
							'name': 'listing',
							'label': translation.includingInListing[LANG],
							'type': 'checkbox',
							'value': [{"v": "yes", "l": translation.yes[LANG]}],
							'required': true,
							'fieldMsg': translation.cbFormStep2ComputedUIListingFieldMSG[LANG],
							'onAction': function (id, data) {
								if (data[0] === 'yes') {
									jQuery(".wizardForm #filter-wrapper").slideDown();
									jQuery(".wizardForm #sorting-wrapper").slideDown();
									jQuery(".wizardForm #sortDirection-wrapper").slideDown();
								}
								else {
									jQuery(".wizardForm #filter-wrapper").slideUp();
									jQuery(".wizardForm #sorting-wrapper").slideUp();
									jQuery(".wizardForm #sortDirection-wrapper").slideUp();
								}
							}
						},
						{
							'name': 'filter',
							'label': translation.optionalDisplayFilter[LANG],
							'type': 'select',
							'value': [
								{"v": "date", "l": translation.date[LANG]},
								{"v": "fulldate", "l": translation.fullDate[LANG]},
								{"v": "TTL", "l": translation.ttlValue[LANG]},
								{"v": "uppercase", "l": translation.uppercase[LANG]},
								{"v": "lowercase", "l": translation.lowercase[LANG]},
								{"v": "trimmed", "l": translation.trimmedCharacters},
								{"v": "trimmed100", "l": translation.lowercaseCharacters[LANG]},
								{"v": "object", "l": translation.renderedObject[LANG]}
							],
							'required': false,
							'fieldMsg': translation.cbFormStep2ComputedUIFilterFieldMSG[LANG]
						},
						{
							'name': 'sorting',
							'label': translation.defaultSortingField[LANG],
							'type': 'checkbox',
							'value': [{"v": "yes", "l": translation.yes[LANG]}],
							'required': false,
							'fieldMsg': translation.cbFormStep2ComputedUISortingFieldMSG[LANG]
						},
						{
							'name': 'sortDirection',
							'label': 'Default Sort Descending ',
							'type': 'select',
							'value': [{"v": "asc", "l": "ASC"}, {"v": "desc", "l": "DESC"}],
							'required': false,
							'fieldMsg': translation.cbFormStep2ComputedUISortDirectionFieldMSG[LANG]
						}
					]
				},
				{
					'name': 'form',
					'label': translation.inputFormProperties[LANG],
					'type': 'group',
					'collapsed': true,
					'entries': [
						{
							"name": "type",
							"label": translation.uiType[LANG],
							"type": "select",
							"value": [
								{"v": "text", "l": translation.textInput[LANG]},
								{"v": "email", "l": translation.emailAddress[LANG]},
								{"v": "url", "l": "URL"},
								{"v": "phone", "l": translation.phoneNumber[LANG]},
								{"v": "number", "l": translation.number[LANG]},
								{"v": "password", "l": translation.password[LANG]},
								{"v": "textarea", "l": translation.textBox[LANG]},
								{"v": "editor", "l": translation.advancedEditor[LANG]},
								{"v": "radio", "l": translation.listOneValue[LANG]},
								{"v": "checkbox", "l": translation.listMultipleValue[LANG]},
								{"v": "select", "l": translation.listDropDownMenu[LANG]},
								{"v": "multi-select", "l": translation.listDropDownMenuMultipleSelection[LANG]}
							],
							"required": true,
							"fieldMsg": translation.cbFormStep2FileUITypeFieldMsg[LANG],
							'onAction': function (id, data) {
								var arr1 = ['radio', 'checkbox', 'select', 'multi-select'];
								if (arr1.indexOf(data) !== -1) {
									jQuery(".wizardForm #defaultValue-wrapper").slideDown();
								}
								else {
									jQuery(".wizardForm #defaultValue-wrapper").slideUp();
								}
							}
						},
						{
							'name': 'defaultValue',
							'label': translation.defaultValue[LANG],
							'type': 'textarea',
							'rows': 2,
							'placeholder': translation.cbFormStep2UserFormDefaultValuePlaceholder[LANG],
							'value': '',
							'tooltip': translation.cbFormStep2UserFormDefaultValueTooltip[LANG],
							'fieldMsg': translation.cbFormStep2UserFormDefaultValueFieldMsg[LANG]
						},
						{
							"name": "placeholder",
							"label": translation.placeholder[LANG],
							"type": "text",
							"placeholder": translation.cbFormStep2UserFormPlaceholderPlaceholder[LANG],
							"tooltip": translation.cbFormStep2UserFormPlaceholderTooltip[LANG],
							"value": "",
							"required": false,
							"fieldMsg": translation.cbFormStep2UserFormPlaceholderFieldMsg[LANG]
						},
						{
							"name": "tooltip",
							"label": translation.tooltip[LANG],
							"type": "text",
							"placeholder": translation.cbFormStep2UserFormTooltipPlaceholder[LANG],
							"tooltip": translation.cbFormStep2UserFormTooltipTooltip[LANG],
							"value": "",
							"required": false,
							"fieldMsg": translation.cbFormStep2UserFormTooltipFieldMsg[LANG]
						}
					]
				}
			]
		},
		step3: {
			settings: [
				{
					"name": "servicePort",
					"label": translation.servicePort[LANG],
					"type": "number",
					"placeholder": "4100",
					"value": "",
					"tooltip": translation.enterServicePortNumber[LANG],
					"required": true,
					'fieldMsg': translation.cbFormStep3ServicePortFieldMsg[LANG]
				},
				{
					"name": "requestTimeout",
					"label": translation.requestTimeout[LANG],
					"type": "number",
					"placeholder": "30",
					"value": "",
					"tooltip": translation.cbFormStep3requestTimeoutTooltip[LANG],
					"required": false,
					'fieldMsg': translation.cbFormStep3requestTimeoutFieldMsg[LANG]
				},
				{
					"name": "requestTimeoutRenewal",
					"label": translation.requestTimeoutRenewal[LANG],
					"type": "number",
					"placeholder": "5",
					"value": "",
					"tooltip": translation.cbFormStep3requestTimeoutRenewalTooltip[LANG],
					"required": false,
					'fieldMsg': translation.cbFormStep3requestTimeoutRenewalFieldMsg[LANG]
				},
				{
					"name": "maxFileUpload",
					"label": translation.maximumUploadFileLimit[LANG],
					"type": "select",
					"tooltip": translation.cbFormStep3MaxFileUploadTooltip[LANG],
					"value": [
						{'v': '500', 'l': '500kb', 'selected': true},
						{'v': '1024', 'l': '1M'},
						{'v': '2048', 'l': '2M'},
						{'v': '4096', 'l': '4M'},
						{'v': '6144', 'l': '6M'},
						{'v': '8192', 'l': '8M'},
						{'v': '10240', 'l': '10M'}
					],
					"required": false,
					'fieldMsg': translation.cbFormStep3MaxFileUploadFieldMsg[LANG]
				},
				{
					"name": "collection",
					"label": translation.defaultCollection[LANG],
					"type": "text",
					"placeholder": translation.data[LANG],
					"tooltip": translation.cbFormStep3defaultCollectionTooltip[LANG],
					"value": "",
					"required": true,
					'fieldMsg': translation.cbFormStep3defaultCollectionFieldMsg[LANG]
				},
				{
				    'name': 'errors',
				    'label': translation.errorCodesMessage[LANG],
				    'type': 'textarea',
				    'height': '200px',
				    "value": '{ }',
				    'required': true,
				    "tooltip": translation.cbFormStep3errorsTooltip[LANG],
					'fieldMsg': translation.cbFormStep3errorsFieldMsg[LANG]
				},

				{
					"name": "extKeyRequired",
					"label": translation.requiresExternalKey[LANG],
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': translation.cbFormStep3extKeyRequiredFieldMsg[LANG]
				},
				{
					"name": "session",
					"label": translation.supportsSession[LANG],
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': translation.cbFormStep3SessionFieldMsg[LANG]
				},
				{
					"name": "oauth",
					"label": translation.secureWithoAuth[LANG],
					"type": "radio",
					"value": [{"v": true}, {"v": false}],
					"required": true,
					'fieldMsg': translation.cbFormStep3oauthFieldMsg[LANG]
				}
                ,
                {
                    "name": "urac",
                    "label": translation.requireurac[LANG],
                    "type": "radio",
                    "value": [{"v": true}, {"v": false}],
                    "required": true,
                    'fieldMsg': translation.cbFormStep3uracFieldMsg[LANG]
                }
                ,
                {
                    "name": "urac_Profile",
                    "label": translation.urac_Profile[LANG],
                    "type": "radio",
                    "value": [{"v": true}, {"v": false}],
                    "required": true,
                    'fieldMsg': translation.cbFormStep3urac_ProfileFieldMsg[LANG]
                }
                ,
                {
                    "name": "urac_ACL",
                    "label": translation.urac_ACL[LANG],
                    "type": "radio",
                    "value": [{"v": true}, {"v": false}],
                    "required": true,
                    'fieldMsg': translation.cbFormStep3urac_ACLFieldMsg[LANG]
                }
                ,
                {
                    "name": "provision_ACL",
                    "label": translation.provision_ACL[LANG],
                    "type": "radio",
                    "value": [{"v": true}, {"v": false}],
                    "required": true,
                    'fieldMsg': translation.cbFormStep3provision_ACLFieldMsg[LANG]
                }
			]
		},
		step4: [
			{
				'label': translation.basicAPIInformation[LANG],
				'name': 'api',
				'type': 'group',
				'entries': [
					{
						'name': 'route',
						'label': translation.apiRoute[LANG],
						'type': 'text',
						'placeholder': translation.slashList[LANG],
						'value': '',
						'tooltip': translation.cbFormStep4Route[LANG],
						'required': true,
						'fieldMsg': translation.cbFormStep4Route[LANG]
					},
					{
						'name': 'method',
						'label': translation.apiMethod[LANG],
						'type': 'radio',
						'value': [{'v': "get", "l": translation.get[LANG]}, {
							'v': "post",
							"l": translation.post[LANG]
						}, {'v': "put", "l": translation.put[LANG]}, {'v': "del", "l": translation.del[LANG]}],
						'required': true,
						'fieldMsg': translation.cbFormStep4MethodFieldMsg[LANG]
					},
					{
						'name': 'type',
						'label': translation.apiType[LANG],
						'type': 'radio',
						'value': [
							{'v': "list", "l": translation.list[LANG]},
							{'v': "get", "l": translation.getLowercase[LANG]},
							{'v': "delete", "l": translation.deleteLowercase[LANG]},
							{'v': "add", "l": translation.add[LANG]},
							{'v': "update", "l": translation.update[LANG]}
						],
						'required': true,
						'fieldMsg': translation.cbFormStep4apiTypeFieldMsg[LANG]
					},
					{
						'name': 'codeValues',
						'label': translation.availableErrorCodes[LANG],
						'type': 'textarea',
						'rows': 6,
						'value': ''
					},
					{
						'name': 'code',
						'label': translation.defaultErrorCode[LANG],
						'type': 'number',
						'placeholder': '400',
						'value': '',
						'tooltip': translation.cbFormStep4defaultErrorCodeTooltip[LANG],
						'required': true,
						'fieldMsg': translation.cbFormStep4defaultErrorCodeFieldMsg[LANG]
					}
				]
			},
			{
				'label': translation.apiDisplayInformation[LANG],
				'name': 'label',
				'type': 'group',
				"entries": [
					{
						'name': 'label',
						'label': translation.aPILabel[LANG],
						'type': 'text',
						'placeholder': translation.listEntries[LANG],
						'value': '',
						'tooltip': translation.cbFormStep4labelTooltip[LANG],
						'required': true,
						'fieldMsg': translation.cbFormStep4labelFieldMsg[LANG]
					},
					{
						'name': 'group',
						'label': translation.aPIGroup[LANG],
						'type': 'text',
						'placeholder': translation.news[LANG],
						'value': '',
						'tooltip': translation.cbFormStep4GroupTooltip[LANG],
						'required': true,
						'fieldMsg': translation.cbFormStep4GroupFieldMsg[LANG]
					},
					{
						'name': 'groupMain',
						'label': translation.cbFormStep4groupMainLabel[LANG],
						'type': 'radio',
						'value': [{"v": true}, {"v": false}],
						'required': true,
						'fieldMsg': translation.cbFormStep4groupMainFieldMsg[LANG]
					}
				]
			},
			{
				'label': translation.apiInputs[LANG],
				'name': 'inputsGroup',
				'type': 'group',
				'collapsed': true,
				'entries': [
					{
						'name': 'inputs',
						'label': translation.apiInputs[LANG],
						'type': 'checkbox',
						'value': [],
						'required': true,
						'fieldMsg': translation.cbFormStep4apiInputsFieldMsg[LANG]
					}
				]
			},
			{
				'label': translation.apiWorkflow[LANG],
				'name': 'workflow',
				'type': 'group',
				"collapsed": true,
				'entries': [
					{
						'name': 'initialize',
						'label': translation.initialize[LANG],
						'type': 'textarea',
						"rows": 6,
						"tooltip": translation.cbFormStep4initializeTooltip[LANG],
						'value': "",
						'required': false,
						'fieldMsg': translation.cbFormStep4initializeFieldMsg[LANG]
					},
					{
						'name': 'preExec',
						'label': translation.preExec[LANG],
						'type': 'textarea',
						"rows": 6,
						"tooltip": translation.cbFormStep4preExecTooltip[LANG],
						'value': "",
						'required': false,
						'fieldMsg': translation.cbFormStep4preExecFieldMsg[LANG]
					},
					{
						'name': 'exec',
						'label': 'Execute',
						'type': 'textarea',
						"rows": 6,
						"tooltip": translation.cbFormStep4executeTooltip[LANG],
						'value': "",
						'required': false,
						'fieldMsg': translation.cbFormStep4executeFieldMsg[LANG]
					},
					{
						'name': 'postExec',
						'label': translation.postExec[LANG],
						'type': 'textarea',
						"rows": 6,
						"tooltip": translation.cbFormStep4postExecTooltip[LANG],
						'value': "",
						'required': false,
						'fieldMsg': translation.cbFormStep4postExecFieldMsg[LANG]
					},
					{
						'name': 'response',
						'label': translation.response[LANG],
						'type': 'textarea',
						"rows": 6,
						"tooltip": translation.cbFormStep4responseTooltip[LANG],
						'value': "",
						'required': false,
						'fieldMsg': translation.cbFormStep4responseFieldMsg[LANG]
					}
				]
			}
		]
	},

	permissions: {
		'listServices': ['dashboard', '/cb/list', 'get'],
		'addService': ['dashboard', '/cb/add', 'post'],
		'updateService': ['dashboard', '/cb/update', 'put'],
		'getService': ['dashboard', '/cb/get', 'get'],
		'servicesRevisions': ['dashboard', '/cb/listRevisions', 'get']
	}
};
