"use strict";

var cmModuleStgTranslation = {
	"contentManagement": {
		"ENG": "Content Management",
		"FRA": "Gestion de Contenu"
	},
	//controller
	"areYouSureWantDeleteSelectedEntry": {
		"ENG": "Are you sure you want to delete the selected entry?",
		"FRA": "Êtes-vous sûr de vouloir effacer l'entrée selectionnée?"
	},
	"areYouSureWantDeleteSelectedEntryS": {
		"ENG": "Are you sure you want to delete the selected entry(s)?",
		"FRA": "Êtes-vous sûr de vouloir effacer les entrées selectionnées?"
	},
	"goBack": {
		"ENG": "Go Back",
		"FRA": "Précédent"
	},
	"youDoNotHaveAccessContentModule": {
		"ENG": "You do not have access to this content module.",
		"FRA": "Vous n'avez pas accès à ce module de contenu."
	},
	"addNewEntry": {
		"ENG": "Add New Entry",
		"FRA": "Nouvelle Entrée"
	},
	"saveData": {
		"ENG": "Save Data",
		"FRA": "Sauvegarder Données"
	},
	"makeSureYouHaveFilledInputs": {
		"ENG": "Make sure you have filled all the files inputs.",
		"FRA": "Assurez-vous d'avoir rempli toutes les entrées de fichiers."
	},
	"dataAddedSuccessfully": {
		"ENG": "Data Added Successfully.",
		"FRA": "Données ajoutées avec succès."
	},
	"updateEntry": {
		"ENG": "Update Entry",
		"FRA": "Mettre à jour l'entrée"
	},
	"viewEntry": {
		"ENG": "View Entry",
		"FRA": "Voir l'entrée"
	},
	"oneOrMoreSelectedDataNotDeleted": {
		"ENG": "one or more of the selected Data was not deleted.",
		"FRA": "une ou plusieurs des données sélectionnées n'a pas été effacé."
	},
	//Directives
	//infoBox
	"clickOpenFile": {
		"ENG": "Click to Open File",
		"FRA": "Cliquer pour ouvrir le fichier"
	},
	"clickOpenImage": {
		"ENG": "Click to Open Image",
		"FRA": "Cliquer pour ouvrir l'image"
	},
	"clickDownloadAudioTrack": {
		"ENG": "Click to Download Audio Track",
		"FRA": "Cliquer pour télécharger la piste audio"
	},
	"clickDownloadVideo": {
		"ENG": "Click to Download Video",
		"FRA": "Cliquer pour télécharger la vidéo"
	},
	//list
	"manageContent": {
		"ENG": "Manage Content",
		"FRA": "Gérer le Contenu"
	},
	"managingContentOf": {
		"ENG": "Managing Content of",
		"FRA": "Gérant le Contenu de"
	},
	"loadingData": {
		"ENG": "Loading Data",
		"FRA": "Chargement des Données"
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
		"FRA": "Aucuns services de gestion de contenu déployés. Allez à la section"
	},
	
	"sectionAndDeployThem": {
		"ENG": "Section and deploy them.",
		"FRA": "et déployez-en."
	},
	//Services
	//contentManagement
	"yourBrowserDoesNotSupportAudioTag": {
		"ENG": "Your browser does not support the audio tag.",
		"FRA": "Votre navigateur ne supporte pas la balise audio."
	}
};

for (var attrname in cmModuleStgTranslation) {
	translation[attrname] = cmModuleStgTranslation[attrname];
}

var cmModuleStgNav = [
	{
		'id': 'content-management',
		'label': translation.contentManagement[LANG],
		'checkPermission': {
			'service': 'dashboard',
			'route': '/cb/list'
		},
		'url': '#/content-management',
		'tplPath': 'modules/stg/contentManagement/directives/list.tmpl',
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
		'scripts': ['modules/stg/contentManagement/config.js', 'modules/stg/contentManagement/controller.js', 'modules/stg/contentManagement/services/contentManagement.js'],
		'ancestor': [translation.home[LANG]]
	}
];
navigation = navigation.concat(cmModuleStgNav);