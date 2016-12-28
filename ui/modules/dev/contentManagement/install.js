"use strict";

var cmModuleDev = uiModuleDev + '/contentManagement';

var cmModuleDevTranslation = {
	"contentManagement": {
		"ENG": "Content Management",
		"FRA": "Content Management"
	},
	//controller
	"areYouSureWantDeleteSelectedEntry": {
		"ENG": "Are you sure you want to delete the selected entry?",
		"FRA": "Are you sure you want to delete the selected entry?"
	},
	"areYouSureWantDeleteSelectedEntryS": {
		"ENG": "Are you sure you want to delete the selected entry(s)?",
		"FRA": "Are you sure you want to delete the selected entry(s)?"
	},
	"goBack": {
		"ENG": "Go Back",
		"FRA": "Go Back"
	},
	"youDoNotHaveAccessContentModule": {
		"ENG": "You do not have access to this content module.",
		"FRA": "You do not have access to this content module."
	},
	"addNewEntry": {
		"ENG": "Add New Entry",
		"FRA": "Add New Entry"
	},
	"saveData": {
		"ENG": "Save Data",
		"FRA": "Save Data"
	},
	"makeSureYouHaveFilledInputs": {
		"ENG": "Make sure you have filled all the files inputs.",
		"FRA": "Make sure you have filled all the files inputs."
	},
	"dataAddedSuccessfully": {
		"ENG": "Data Added Successfully.",
		"FRA": "Data Added Successfully."
	},
	"updateEntry": {
		"ENG": "Update Entry",
		"FRA": "Update Entry"
	},
	"viewEntry": {
		"ENG": "View Entry",
		"FRA": "View Entry"
	},
	"oneOrMoreSelectedDataNotDeleted": {
		"ENG": "one or more of the selected Data was not deleted.",
		"FRA": "one or more of the selected Data was not deleted."
	},
	//Directives
	//infoBox
	"clickOpenFile": {
		"ENG": "Click to Open File",
		"FRA": "Click to Open File"
	},
	"clickOpenImage": {
		"ENG": "Click to Open Image",
		"FRA": "Click to Open Image"
	},
	"clickDownloadAudioTrack": {
		"ENG": "Click to Download Audio Track",
		"FRA": "Click to Download Audio Track"
	},
	"clickDownloadVideo": {
		"ENG": "Click to Download Video",
		"FRA": "Click to Download Video"
	},
	//list
	"manageContent": {
		"ENG": "Manage Content",
		"FRA": "Manage Content"
	},
	"managingContentOf": {
		"ENG": "Managing Content of",
		"FRA": "Managing Content of"
	},
	"loadingData": {
		"ENG": "Loading Data",
		"FRA": "Loading Data"
	},
	"noContentManagementServicesRunning": {
		"ENG": "No Content Management Services are running.",
		"FRA": "No Content Management Services are running."
	},
	"createNewServicesIn": {
		"ENG": "Create New Services in",
		"FRA": "Create New Services in"
	},
	//No Content Management Services are deployed yet. Head to the Environments Section and deploy them.
	"noContentManagementServiceDeployedYet": {
		"ENG": "No Content Management Services are deployed yet. Head to the",
		"FRA": "No Content Management Services are deployed yet. Head to the"
	},

	"sectionAndDeployThem": {
		"ENG": "Section and deploy them.",
		"FRA": "Section and deploy them."
	},
	//Services
	//contentManagement
	"yourBrowserDoesNotSupportAudioTag": {
		"ENG": "Your browser does not support the audio tag.",
		"FRA": "Your browser does not support the audio tag."
	}
};

for (var attrname in cmModuleDevTranslation) {
	translation[attrname] = cmModuleDevTranslation[attrname];
}

var cmModuleDevNav = [
	{
		'id': 'content-management',
		'label': translation.contentManagement[LANG],
		'checkPermission': {
			'service': 'dashboard',
			'route': '/cb/list',
			'method': 'get'
		},
		'url': '#/content-management',
		'tplPath': cmModuleDev + '/directives/list.tmpl',
		'icon': 'newspaper',
		'pillar': {
			'name': 'operate',
			'label': translation.operate[LANG],
			'position': 4
		},
		'mainMenu': true,
		'contentMenu': true,
		'tracker': true,
		'order': 100,
		'scripts': [
			cmModuleDev + '/config.js',
			cmModuleDev + '/controller.js',
			cmModuleDev + '/services/contentManagement.js'
		],
		'ancestor': [translation.home[LANG]]
	}
];

navigation = navigation.concat(cmModuleDevNav);
